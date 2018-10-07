const db = require('../models');
const utility = require('../lib/utility');
const userHelper = require('../lib/user');

const { User, UserFollow } = db;

module.exports = {
  async signup(req, res) {
    const values = utility.trimValues(req.body);
    const {
      firstname, lastname, email, password
    } = values;

    const existingUser = await userHelper.findUser(email);

    if (existingUser) {
      return res.status(409).send({ message: 'Email is in use' });
    }

    const encryptedPassword = await utility.encryptPassword(password);

    User.create({
      firstname,
      lastname,
      email,
      password: encryptedPassword
    })
      .then(newUser => res.status(201).send({
        message: 'Successfully created your account',
        token: utility.createToken(newUser)
      }))
      .catch(() => res.status(500).send({ error: 'Internal server error' }));
  },
  async signin(req, res) {
    const values = utility.trimValues(req.body);
    const { email, password } = values;

    const existingUser = await userHelper.findUser(email);

    if (!existingUser) {
      return res.status(400).send({ message: 'The account with this email does not exist' });
    }

    const match = await utility.comparePasswords(password, existingUser.dataValues.password);

    if (match) {
      res.status(200).send({
        message: 'Successfully signed in',
        token: utility.createToken(existingUser.dataValues.id),
      });
    } else {
      res.status(400).send({ message: 'Incorrect email or password' });
    }
  },
  async follow(req, res) {
    const followerId = req.userId;
    const followedId = req.body.userId;
    try {
      await userHelper.throwErrorIfFollowed(followerId, followedId);
      const userFollow = await UserFollow.create({ followerId, followedId });
      res.status(201).send({
        message: `User ${userFollow.dataValues.followedId} followed successfully`
      });
    } catch (err) {
      res.status(500).send({
        message: err.message === 'existingFollow'
          ? 'You\'re already following this user'
          : 'Internal server error'
      });
    }
  },
  async unfollow(req, res) {
    const followerId = req.userId;
    const followedId = req.body.userId;
    try {
      const userUnfollow = await UserFollow.destroy({ where: { followerId, followedId } });
      if (userUnfollow === 0) throw new Error('unExistingFollow');
      res.status(201).send({
        message: `User ${followedId} unfollowed successfully`
      });
    } catch (err) {
      res.status(500).send({
        message: err.message === 'unExistingFollow'
          ? 'You\'re not following this user, no need to unfollow'
          : 'Internal server error'
      });
    }
  },
  async followed(req, res) {
    const { userId } = req;
    try {
      const followedUsers = await UserFollow.findAll({
        where: { followerId: userId },
        attributes: { exclude: ['followerId'] }
      });
      res.status(200).send({
        data: followedUsers,
        message: 'Retrieved followed users'
      });
    } catch (err) {
      res.status(500).send({
        message: 'Internal server error'
      });
    }
  },
};
