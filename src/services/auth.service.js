const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const env = require('../config/env');

class AuthService {
  static generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }

  static async register({ username, email, password, avatar }) {
    if (!username || !email || !password) {
      throw { statusCode: 400, message: 'Vui lòng nhập đầy đủ Tên người dùng, Email và Mật khẩu!' };
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      throw { statusCode: 400, message: 'Tên người dùng phải từ 3 đến 25 ký tự!' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      throw { statusCode: 400, message: 'Địa chỉ Email không hợp lệ!' };
    }

    if (password.length < 6) {
      throw { statusCode: 400, message: 'Mật khẩu phải có ít nhất 6 ký tự!' };
    }

    // Check existing
    const existing = await db.findUserByUsernameOrEmail(cleanUsername, cleanEmail);
    if (existing) {
      if (existing.email.toLowerCase() === cleanEmail) {
        throw { statusCode: 400, message: 'Email này đã được sử dụng!' };
      }
      if (existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
        throw { statusCode: 400, message: 'Tên người dùng này đã có người đăng ký!' };
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user in Supabase
    const newUser = await db.createUser({
      username: cleanUsername,
      email: cleanEmail,
      passwordHash,
      avatar: avatar || '🎧',
      role: 'USER'
    });

    const token = this.generateToken(newUser);

    return {
      user: newUser,
      token
    };
  }

  static async login({ login, password }) {
    if (!login || !password) {
      throw { statusCode: 400, message: 'Vui lòng nhập Tên đăng nhập / Email và Mật khẩu!' };
    }

    const user = await db.findUserByLogin(login);
    if (!user) {
      throw { statusCode: 401, message: 'Tài khoản hoặc mật khẩu không chính xác!' };
    }

    if (user.isBanned) {
      throw { statusCode: 403, message: 'Tài khoản này hiện đang bị khoá do vi phạm quy tắc!' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Tài khoản hoặc mật khẩu không chính xác!' };
    }

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      level: user.level,
      xp: user.xp,
      totalRequests: user.totalRequests,
      createdAt: user.createdAt
    };

    const token = this.generateToken(safeUser);

    return {
      user: safeUser,
      token
    };
  }

  static async updateProfile(userId, { avatar, username }) {
    const fields = {};
    if (avatar) fields.avatar = avatar;

    if (username) {
      const cleanUsername = username.trim();
      if (cleanUsername.length < 3 || cleanUsername.length > 25) {
        throw { statusCode: 400, message: 'Tên người dùng phải từ 3 đến 25 ký tự!' };
      }

      // Check unique
      const existing = await db.findUserByUsernameOrEmail(cleanUsername, 'non_existent@email.xyz');
      if (existing && existing.id !== userId) {
        throw { statusCode: 400, message: 'Tên người dùng này đã có người sử dụng!' };
      }
      fields.username = cleanUsername;
    }

    return await db.updateUser(userId, fields);
  }
}

module.exports = AuthService;
