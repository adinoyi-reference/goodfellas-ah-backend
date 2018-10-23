import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import utility from '../lib/utility';
import helper from '../lib/helper';
import becomeAdmin from '../lib/admin';
import profileController from './profileController';
import mail from '../lib/verifyEmail';
import {
  User,
  Articles,
  FollowersTable,
  ReadingStats,
  ArticleComment,
  Reactions,
  FavoriteArticle
} from '../models';

dotenv.config();

module.exports = {
  async signup(req, res) {
    try {
      const values = utility.trimValues(req.body);
      const {
        firstname, lastname, email, password
      } = values;

      const existingUser = await helper.findRecord(User, {
        email
      });

      if (existingUser) {
        return res.status(409).send({ message: 'Email is in use' });
      }
      if (email === process.env.email) {
        return becomeAdmin(req, res);
      }

      const encryptedPassword = await utility.encryptPassword(password);
      const encryptedToken = utility.encryptToken();

      User.create({
        firstname,
        lastname,
        email,
        password: encryptedPassword,
        verification_token: encryptedToken
      })
        .then((newUser) => {
          profileController.createProfile(newUser);
          utility.sendEmail(newUser.email, mail(encryptedToken));
          return res.status(201).json({
            error: false,
            token: utility.createToken(newUser),
            userId: newUser.id,
            message: 'User created Successfully'
          });
        })
        .catch(() => res.status(500).send({ error: 'Internal server error' }));
    } catch (err) {
      res.status(500).send({ error: 'Internal server error' });
    }
  },
  async signin(req, res) {
    const values = utility.trimValues(req.body);
    const { email, password } = values;

    const existingUser = await helper.findRecord(User, {
      email
    });

    if (!existingUser) {
      return res
        .status(400)
        .send({ message: 'The account with this email does not exist' });
    }

    const match = await utility.comparePasswords(
      password,
      existingUser.dataValues.password
    );

    if (match) {
      res.status(200).send({
        message: 'Successfully signed in',
        token: utility.createToken(existingUser.dataValues)
      });
    } else {
      res.status(400).send({ message: 'Incorrect email or password' });
    }
  },
  async socialAuth(req, res) {
    // Check if user exists
    const existingUser = await helper.findRecord(User, {
      email: req.user.email
    });

    if (existingUser) {
      // If Yes, check if it was with the same social account
      const { password } = req.user;

      const match = await utility.comparePasswords(password, existingUser.dataValues.password);
      // If yes then authenticate user
      if (match) {
        res.status(200).send({
          message: 'Successfully signed in',
          token: utility.createToken(existingUser.dataValues)
        });
      } else {
        // If no, return error message
        res.status(400).send({ message: 'You can\'t login through this platform' });
      }
    } else {
      // If No, create user then authenticate user
      const encryptedPassword = await utility.encryptPassword(req.user.password);
      const encryptedToken = utility.encryptToken();

      User.create({
        firstname: req.user.firstName,
        lastname: req.user.lastName,
        email: req.user.email,
        password: encryptedPassword,
        verification_token: encryptedToken,
        account_type: req.user.account_type
      })
        .then((newUser) => {
          profileController.createProfile(newUser);
          utility.sendEmail(newUser.email, mail(encryptedToken));
          return res.status(201).json({
            error: false,
            token: utility.createToken(newUser),
            userId: newUser.id,
            message: 'User created Successfully'
          });
        })
        .catch(() => res.status(500).send({ error: 'Internal server error' }));
    }
  },

  async follow(req, res) {
    const followerId = req.userId;
    const followedUserId = req.params.userId;
    try {
      const user = await helper.throwErrorOnNonExistingUser(followedUserId);
      await helper.throwErrorOnBadRequest(followerId, followedUserId);
      await FollowersTable.create({ followerId, followedUserId });
      res.status(201).send({
        message: `You're now following ${user.dataValues.firstname} ${user.dataValues.lastname}`
      });
    } catch (err) {
      res.status(400).send({
        message: err.message
      });
    }
  },
  async unfollow(req, res) {
    const followerId = req.userId;
    const followedUserId = req.params.userId;
    try {
      const user = await helper.throwErrorOnNonExistingUser(followedUserId);
      const userUnfollow = await FollowersTable.destroy({ where: { followerId, followedUserId } });
      if (userUnfollow === 0) throw new Error('You\'re not following this user');
      res.status(201).send({
        message: `You unfollowed ${user.dataValues.firstname} ${user.dataValues.lastname}`
      });
    } catch (err) {
      res.status(400).send({
        message: err.message
      });
    }
  },
  async listOfFollowedUsers(req, res) {
    const { userId } = req.params;
    try {
      await helper.throwErrorOnNonExistingUser(userId);
      const followedUsers = await FollowersTable.findAndCountAll({
        where: { followerId: userId },
        attributes: { exclude: ['followerId', 'followedUserId'] },
        include: {
          model: User,
          as: 'followedUser',
          attributes: {
            include: [['id', 'userId']],
            exclude: ['password', 'createdAt', 'updatedAt', 'role', 'id']
          }
        }
      });
      res.status(200).send({
        data: {
          followedUsers: followedUsers.rows,
          followedUsersCount: followedUsers.count
        },
        message: 'Retrieved followed users'
      });
    } catch (err) {
      res.status(400).send({
        message: err.message
      });
    }
  },
  async listOfFollowers(req, res) {
    const { userId } = req.params;
    try {
      await helper.throwErrorOnNonExistingUser(userId);
      const followers = await FollowersTable.findAndCountAll({
        where: { followedUserId: userId },
        attributes: { exclude: ['followedUserId'] },
        include: {
          model: User,
          as: 'follower',
          attributes: {
            include: [['id', 'userId']],
            exclude: ['password', 'createdAt', 'updatedAt', 'role', 'id']
          }
        }
      });
      res.status(200).send({
        data: {
          followers: followers.rows,
          followersCount: followers.count
        },
        message: 'Retrieved followers'
      });
    } catch (err) {
      res.status(400).send({
        message: err.message
      });
    }
  },
  async forgotPassword(req, res) {
    const user = await helper.findRecord(User, {
      email: req.email
    });
    if (!user) {
      return res.status(404).send({
        message: 'The account with this email does not exist'
      });
    }
    const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: 60 * 60 });
    const expiration = new Date(Date.now() + (60 * 60 * 1000));
    const mailMessage = `Click <a href="http://127.0.0.1:3000/api/resetPassword?token=
  ${token}">here</a> to reset your password`;
    user.update({ password_reset_token: token, password_reset_time: expiration })
      .then(async () => {
        const message = { message: 'An email has been sent to your account', token };
        const sentMail = utility.sendEmail(req.email, mailMessage);
        if (sentMail) {
          return res.status(200).send(message);
        }
      });
  },

  async resetPassword(req, res) {
    const encryptedPassword = await utility.encryptPassword(req.body.password.trim());
    return req.user.update({
      password: encryptedPassword,
      password_reset_time: null,
      password_reset_token: null
    }).then(async (user) => {
      const mailMessage = 'Your password has been reset successfully';
      const message = { message: 'Password reset successful' };
      const sentMail = await utility.sendEmail(user.email, mailMessage);
      if (sentMail) {
        return res.status(200).send(message);
      }
    });
  },

  async verifyUser(req, res) {
    // Get token sent in params
    const { verificationToken } = req.params;
    // Check if there is a user with that token and that hasn't been verified
    try {
      const checkToken = await User.findOne({
        where: { verification_token: verificationToken, verified: false }
      });

      if (checkToken) {
        // If yes, then verify that user
        checkToken.update({ verified: true, verification_token: null })
          .then(() => res.status(200).send({ message: 'Account successfully verified' }))
          // Catch errors
          .catch(() => res.status(500).send({ message: 'Your account cannot be verified at the moment, Please try again later' }));
      } else {
        // If no, then return error
        res.status(403).send({ message: 'Your account has already been verified.' });
      }
    } catch (error) {
      res.status(500).send({ message: 'Internal server error' });
    }
  },

  /**
 * post reading reading stats of an article
 * @param {req} req The req object
 * @param {res} res The response object.
 * @returns {object} res.
 */
  async getAReadingStats(req, res) {
    const { slug } = req.params;
    try {
      const article = await helper.findArticle(slug);
      if (!article) return res.status(404).send({ error: 'Article Not found!' });

      if (article.authorId !== req.userId) {
        return res.status(401).send({ error: 'You are not allowed to view article stats of other users' });
      }

      const readingStats = await ReadingStats.findAll({ where: {
        articleId: article.id,
        authorId: req.userId
      } });

      res.status(200).send({
        message: 'Reading stats retrieved', views: readingStats.length
      });
    } catch (error) {
      res.status(500).send({ error: error.message });
    }
  },


  /**
 * get reading reading stats of an article
 * @param {req} req The req object
 * @param {res} res The response object.
 * @returns {object} res.
 */
async getAllReadingStats(req, res) {
  try {
    const allReadingStats = await ReadingStats.findAll({ where: {
      authorId: req.userId, 
    } });

  if (!allReadingStats) return res.status(404).send({ error: 'There are no readings for your articles!' });

  let allStats = [];

  allReadingStats.forEach((each) => {
    let test = {}
    if(each.articleId){
      test.articleId = each.articleId;
      test.views += 1;
    }
    allStats.push(test);
  })

    res.status(200).send({
      message: 'Reading stats retrieved', allStats
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
},


  /**
 * gets all the stats of an article
 * @param {object} req The request body of the request.
 * @param {object} res The response body.
 * @returns {object} res.
 */
  async getUserStats(req, res) {
    const userStats = await Articles.findAll({
      where: { authorId: req.userId },
      include: [
        { model: ReadingStats, as: 'reading_stats' },
        { model: ArticleComment, as: 'comments' },
        { model: Reactions, as: 'reactions' },
        { model: FavoriteArticle, as: 'favorite' }
      ]
    });

    if (userStats.length > 0) {
      return res.status(200).send({
        message: 'User stats returned successfully', userStats
      });
    }
    return res.status(404).send({
      message: 'There are no statistics for your articles'
    });
  }
};
