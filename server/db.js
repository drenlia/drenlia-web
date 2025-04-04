/**
 * Database utility module
 * Provides a singleton database connection and utility functions
 */

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');

// Database file path
const DB_PATH = path.join(__dirname, 'database.sqlite');

// Create a singleton database connection
let db;

/**
 * Get the database connection
 * @returns {Database} The database connection
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Close the database connection
 */
function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// User-related functions
const userFunctions = {
  /**
   * Get a user by email
   * @param {string} email - The user's email
   * @returns {Object|null} The user object or null if not found
   */
  getUserByEmail(email) {
    const stmt = getDb().prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) || null;
  },

  /**
   * Get a user by Google ID
   * @param {string} googleId - The user's Google ID
   * @returns {Object|null} The user object or null if not found
   */
  getUserByGoogleId(googleId) {
    const stmt = getDb().prepare('SELECT * FROM users WHERE google_id = ?');
    return stmt.get(googleId) || null;
  },

  /**
   * Get a user by ID
   * @param {number} id - The user's ID
   * @returns {Object|null} The user object or null if not found
   */
  getUserById(id) {
    const stmt = getDb().prepare('SELECT * FROM users WHERE user_id = ?');
    return stmt.get(id) || null;
  },

  /**
   * Create or update a user from Google profile
   * @param {Object} profile - The Google profile object
   * @returns {Object} The user object
   */
  upsertUserFromGoogle(profile) {
    const db = getDb();
    const existingUser = this.getUserByGoogleId(profile.id);
    
    if (existingUser) {
      // Update existing user
      const stmt = db.prepare(`
        UPDATE users 
        SET first_name = ?, last_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE google_id = ?
      `);
      
      stmt.run(
        profile.name.givenName,
        profile.name.familyName,
        profile.emails[0].value,
        profile.id
      );
      
      return this.getUserByGoogleId(profile.id);
    } else {
      // Check if user exists with the same email
      const userByEmail = this.getUserByEmail(profile.emails[0].value);
      
      if (userByEmail) {
        // Link Google ID to existing user
        const stmt = db.prepare(`
          UPDATE users 
          SET google_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE email = ?
        `);
        
        stmt.run(
          profile.id,
          profile.emails[0].value
        );
        
        return this.getUserByEmail(profile.emails[0].value);
      } else {
        // Create new user
        const stmt = db.prepare(`
          INSERT INTO users (first_name, last_name, email, google_id, admin)
          VALUES (?, ?, ?, ?, 0)
        `);
        
        const info = stmt.run(
          profile.name.givenName,
          profile.name.familyName,
          profile.emails[0].value,
          profile.id
        );
        
        return this.getUserByGoogleId(profile.id);
      }
    }
  },

  /**
   * Get all users
   * @returns {Array} Array of user objects
   */
  getAllUsers() {
    const stmt = getDb().prepare('SELECT * FROM users ORDER BY last_name, first_name');
    return stmt.all();
  },

  /**
   * Create a new user
   * @param {Object} userData - The user data
   * @returns {number} The new user ID
   */
  createUser({ first_name, last_name, email, admin, password_hash }) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        admin, 
        password_hash,
        created_at, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const info = stmt.run(
      first_name,
      last_name,
      email,
      admin ? 1 : 0,
      password_hash
    );

    return {
      id: info.lastInsertRowid,
      success: true
    };
  },

  /**
   * Update a user
   * @param {number} id - The user ID
   * @param {Object} userData - The user data
   * @returns {boolean} True if successful
   */
  updateUser(id, userData) {
    const { first_name, last_name, email, admin } = userData;
    
    // Check if user exists
    const user = this.getUserById(id);
    if (!user) {
      return false;
    }
    
    // Check if email is being changed and if it's already in use
    if (email && email !== user.email) {
      const existingUser = this.getUserByEmail(email);
      if (existingUser && existingUser.user_id !== id) {
        throw new Error('Email is already in use by another user');
      }
    }
    
    // Build the update query dynamically based on provided fields
    let query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    
    if (first_name !== undefined) {
      query += ', first_name = ?';
      params.push(first_name);
    }
    
    if (last_name !== undefined) {
      query += ', last_name = ?';
      params.push(last_name);
    }
    
    if (email !== undefined) {
      query += ', email = ?';
      params.push(email);
    }
    
    if (admin !== undefined) {
      query += ', admin = ?';
      params.push(admin ? 1 : 0);
    }
    
    query += ' WHERE user_id = ?';
    params.push(id);
    
    const stmt = getDb().prepare(query);
    const info = stmt.run(...params);
    
    return info.changes > 0;
  },

  /**
   * Delete a user
   * @param {number} id - The user ID
   * @returns {boolean} True if successful
   */
  deleteUser(id) {
    // Check if user exists
    const user = this.getUserById(id);
    if (!user) {
      return false;
    }
    
    const stmt = getDb().prepare('DELETE FROM users WHERE user_id = ?');
    const info = stmt.run(id);
    
    return info.changes > 0;
  },

  /**
   * Toggle admin status for a user
   * @param {number} id - The user ID
   * @param {boolean} adminStatus - The new admin status
   * @returns {boolean} True if successful
   */
  toggleAdminStatus(id, adminStatus) {
    // Check if user exists
    const user = this.getUserById(id);
    if (!user) {
      return false;
    }
    
    const stmt = getDb().prepare('UPDATE users SET admin = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?');
    const info = stmt.run(adminStatus ? 1 : 0, id);
    
    return info.changes > 0;
  },

  // Add a function to verify passwords for local accounts
  verifyPassword(email, password) {
    const user = this.getUserByEmail(email);
    if (!user || !user.password_hash) {
      return false;
    }
    return bcrypt.compareSync(password, user.password_hash);
  }
};

// Settings-related functions
const settingsFunctions = {
  /**
   * Get a setting by key
   * @param {string} key - The setting key
   * @returns {string|null} The setting value or null if not found
   */
  getSetting(key) {
    const stmt = getDb().prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key);
    return result ? result.value : null;
  },

  /**
   * Set a setting value
   * @param {string} key - The setting key
   * @param {string} value - The setting value
   */
  setSetting(key, value) {
    const db = getDb();
    const existing = this.getSetting(key);
    
    if (existing !== null) {
      const stmt = db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
      stmt.run(value, key);
    } else {
      const stmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
      stmt.run(key, value);
    }
  },

  /**
   * Get all settings
   * @returns {Array} Array of setting objects
   */
  getAllSettings() {
    const stmt = getDb().prepare('SELECT * FROM settings');
    return stmt.all();
  }
};

// About-related functions
const aboutFunctions = {
  /**
   * Get all about sections
   * @returns {Array} Array of about section objects
   */
  getAllSections() {
    const stmt = getDb().prepare('SELECT * FROM about ORDER BY display_order');
    return stmt.all();
  },

  /**
   * Get an about section by ID
   * @param {number} id - The section ID
   * @returns {Object|null} The section object or null if not found
   */
  getSectionById(id) {
    const stmt = getDb().prepare('SELECT * FROM about WHERE about_id = ?');
    return stmt.get(id) || null;
  },

  /**
   * Update an about section
   * @param {number} id - The section ID
   * @param {Object} data - The section data
   * @returns {boolean} True if successful
   */
  updateSection(id, data) {
    // Build the update query dynamically based on provided fields
    let query = 'UPDATE about SET updated_at = CURRENT_TIMESTAMP';
    const params = [];
    
    if (data.title !== undefined) {
      query += ', title = ?';
      params.push(data.title);
    }
    
    if (data.fr_title !== undefined) {
      query += ', fr_title = ?';
      params.push(data.fr_title);
    }
    
    if (data.description !== undefined) {
      query += ', description = ?';
      params.push(data.description);
    }
    
    if (data.fr_description !== undefined) {
      query += ', fr_description = ?';
      params.push(data.fr_description);
    }
    
    if (data.image_url !== undefined) {
      query += ', image_url = ?';
      params.push(data.image_url);
    }
    
    if (data.display_order !== undefined) {
      query += ', display_order = ?';
      params.push(data.display_order);
    }
    
    query += ' WHERE about_id = ?';
    params.push(id);
    
    const stmt = getDb().prepare(query);
    const info = stmt.run(...params);
    
    return info.changes > 0;
  },

  /**
   * Create a new about section
   * @param {Object} data - The section data
   * @returns {number} The new section ID
   */
  createSection(data) {
    const stmt = getDb().prepare(`
      INSERT INTO about (
        title, 
        fr_title,
        description, 
        fr_description,
        image_url, 
        display_order
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      data.title,
      data.fr_title,
      data.description,
      data.fr_description,
      data.image_url,
      data.display_order
    );
    
    return info.lastInsertRowid;
  },

  /**
   * Delete an about section
   * @param {number} id - The section ID
   * @returns {boolean} True if successful
   */
  deleteSection(id) {
    const stmt = getDb().prepare('DELETE FROM about WHERE about_id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  /**
   * Update multiple about section orders at once
   * @param {Array} sections - Array of objects with about_id and display_order
   * @returns {boolean} True if successful
   */
  updateSectionOrders(sections) {
    const db = getDb();
    const stmt = db.prepare('UPDATE about SET display_order = ? WHERE about_id = ?');
    
    const updateOrder = db.transaction((sections) => {
      for (const section of sections) {
        stmt.run(section.display_order, section.about_id);
      }
    });
    
    updateOrder(sections);
    return true;
  }
};

// Team-related functions
const teamFunctions = {
  /**
   * Get all team members
   * @returns {Array} Array of team member objects
   */
  getAllMembers() {
    const stmt = getDb().prepare('SELECT * FROM team ORDER BY display_order');
    return stmt.all();
  },

  /**
   * Get a team member by ID
   * @param {number} id - The member ID
   * @returns {Object|null} The member object or null if not found
   */
  getMemberById(id) {
    const stmt = getDb().prepare('SELECT * FROM team WHERE team_id = ?');
    return stmt.get(id) || null;
  },

  /**
   * Update a team member
   * @param {number} id - The member ID
   * @param {Object} data - The member data
   * @returns {boolean} True if successful
   */
  updateMember(id, data) {
    const stmt = getDb().prepare(`
      UPDATE team 
      SET name = ?, title = ?, fr_title = ?, bio = ?, fr_bio = ?, image_url = ?, display_order = ?, email = ?, updated_at = CURRENT_TIMESTAMP
      WHERE team_id = ?
    `);
    
    const info = stmt.run(
      data.name,
      data.title,
      data.fr_title || null,
      data.bio || null,
      data.fr_bio || null,
      data.image_url || null,
      data.display_order || 0,
      data.email || null,
      id
    );
    
    return info.changes > 0;
  },

  /**
   * Create a new team member
   * @param {Object} data - The member data
   * @returns {number} The new member ID
   */
  createMember(data) {
    const stmt = getDb().prepare(`
      INSERT INTO team (name, title, fr_title, bio, fr_bio, image_url, display_order, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      data.name,
      data.title,
      data.fr_title || null,
      data.bio || null,
      data.fr_bio || null,
      data.image_url || null,
      data.display_order || 0,
      data.email || null
    );
    
    return info.lastInsertRowid;
  },

  /**
   * Delete a team member
   * @param {number} id - The member ID
   * @returns {boolean} True if successful
   */
  deleteMember(id) {
    const stmt = getDb().prepare('DELETE FROM team WHERE team_id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  /**
   * Update team member display orders
   * @param {Array} members - Array of member objects with new display orders
   * @returns {boolean} True if successful
   */
  updateMemberOrders(members) {
    const db = getDb();
    const stmt = db.prepare('UPDATE team SET display_order = ? WHERE team_id = ?');
    
    const updateOrder = db.transaction((members) => {
      for (const member of members) {
        stmt.run(member.display_order, member.team_id);
      }
    });
    
    updateOrder(members);
    return true;
  }
};

// Project-related functions
const projectFunctions = {
  /**
   * Get all projects with their associated project types
   * @returns {Array} Array of project objects with project type information
   */
  getAllProjects() {
    const stmt = getDb().prepare(`
      SELECT 
        p.*,
        pt.type,
        pt.fr_type
      FROM projects p
      LEFT JOIN project_types pt ON p.type_id = pt.type_id
      ORDER BY p.display_order
    `);
    return stmt.all();
  },

  /**
   * Get a project by ID with its associated project type
   * @param {number} id - The project ID
   * @returns {Object|null} The project object or null if not found
   */
  getProjectById(id) {
    const stmt = getDb().prepare(`
      SELECT 
        p.*,
        pt.type,
        pt.fr_type
      FROM projects p
      LEFT JOIN project_types pt ON p.type_id = pt.type_id
      WHERE p.project_id = ?
    `);
    return stmt.get(id) || null;
  },

  /**
   * Update a project
   * @param {number} id - The project ID
   * @param {Object} data - The project data
   * @returns {Object} Response object with success status
   */
  updateProject(id, data) {
    const {
      title,
      description,
      display_order,
      image_url,
      fr_title,
      fr_description,
      type_id,
      status,
      git_url,
      demo_url
    } = data;

    const stmt = getDb().prepare(`
      UPDATE projects 
      SET title = ?,
          description = ?,
          display_order = ?,
          image_url = ?,
          fr_title = ?,
          fr_description = ?,
          type_id = ?,
          status = ?,
          git_url = ?,
          demo_url = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE project_id = ?
    `);

    const info = stmt.run(
      title,
      description,
      display_order,
      image_url,
      fr_title,
      fr_description,
      type_id,
      status,
      git_url,
      demo_url,
      id
    );

    return { success: info.changes > 0 };
  },

  /**
   * Create a new project
   * @param {Object} data - The project data
   * @returns {Object} The created project object
   */
  createProject(data) {
    const {
      title,
      description,
      display_order,
      image_url,
      fr_title,
      fr_description,
      type_id,
      status,
      git_url,
      demo_url
    } = data;

    const stmt = getDb().prepare(`
      INSERT INTO projects (
        title,
        description,
        display_order,
        image_url,
        fr_title,
        fr_description,
        type_id,
        status,
        git_url,
        demo_url,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const info = stmt.run(
      title,
      description,
      display_order,
      image_url,
      fr_title,
      fr_description,
      type_id,
      status,
      git_url,
      demo_url
    );

    return {
      id: info.lastInsertRowid,
      success: true
    };
  },

  /**
   * Delete a project
   * @param {number} id - The project ID
   * @returns {boolean} True if successful
   */
  deleteProject(id) {
    const stmt = getDb().prepare('DELETE FROM projects WHERE project_id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  },

  /**
   * Update project display orders
   * @param {Array} projects - Array of project objects with new display orders
   * @returns {Object} Response object with success status
   */
  updateProjectOrders(projects) {
    console.log('Starting database update for projects:', JSON.stringify(projects, null, 2));
    const db = getDb();
    const stmt = db.prepare('UPDATE projects SET display_order = ? WHERE project_id = ?');
    
    // Log all project IDs in the database
    const allProjects = db.prepare('SELECT project_id FROM projects').all();
    console.log('All project IDs in database:', JSON.stringify(allProjects.map(p => p.project_id), null, 2));
    
    try {
      const updateOrder = db.transaction((projectList) => {
        for (const project of projectList) {
          if (!project.project_id || typeof project.display_order !== 'number') {
            console.log('Invalid project data:', JSON.stringify(project, null, 2));
            throw new Error('Invalid project data: missing project_id or display_order');
          }
          console.log(`Attempting to update project ${project.project_id} to order ${project.display_order}`);
          const info = stmt.run(project.display_order, project.project_id);
          console.log(`Update result for project ${project.project_id}:`, JSON.stringify(info, null, 2));
          if (info.changes === 0) {
            console.log(`No rows affected for project ${project.project_id}`);
            throw new Error(`Project not found with ID: ${project.project_id}`);
          }
        }
      });
      
      updateOrder(projects);
      return { success: true };
    } catch (error) {
      console.error('Error updating project orders:', error);
      return { success: false, message: error.message };
    }
  }
};

// Project Types functions
const projectTypeFunctions = {
  /**
   * Get all project types
   * @returns {Array} Array of project type objects
   */
  getAllProjectTypes() {
    const stmt = getDb().prepare('SELECT * FROM project_types ORDER BY type');
    return stmt.all();
  },

  /**
   * Get a project type by ID
   * @param {number} id - The project type ID
   * @returns {Object|null} The project type object or null if not found
   */
  getProjectTypeById(id) {
    const stmt = getDb().prepare('SELECT * FROM project_types WHERE type_id = ?');
    return stmt.get(id) || null;
  },

  /**
   * Create a new project type
   * @param {Object} data - The project type data
   * @returns {Object} The created project type object
   */
  createProjectType(data) {
    const { type, fr_type } = data;

    const stmt = getDb().prepare(`
      INSERT INTO project_types (type, fr_type, created_at, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    const info = stmt.run(type, fr_type);

    return {
      id: info.lastInsertRowid,
      success: true
    };
  },

  /**
   * Update a project type
   * @param {number} id - The project type ID
   * @param {Object} data - The project type data
   * @returns {boolean} True if successful
   */
  updateProjectType(id, data) {
    const { type, fr_type } = data;

    const stmt = getDb().prepare(`
      UPDATE project_types 
      SET type = ?,
          fr_type = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE type_id = ?
    `);

    const info = stmt.run(type, fr_type, id);

    return info.changes > 0;
  },

  /**
   * Delete a project type
   * @param {number} id - The project type ID
   * @returns {boolean} True if successful
   */
  deleteProjectType(id) {
    const stmt = getDb().prepare('DELETE FROM project_types WHERE type_id = ?');
    const info = stmt.run(id);
    return info.changes > 0;
  }
};

// Export all database functions
module.exports = {
  getDb,
  closeDb,
  users: userFunctions,
  settings: settingsFunctions,
  about: aboutFunctions,
  team: teamFunctions,
  project: projectFunctions,
  projectTypes: projectTypeFunctions,
}; 