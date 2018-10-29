const operator = require('sequelize').Op;
const db = require('../models');

const { User } = db;

const generateErrorMessage = (missing) => {
  let errorString = 'Please fill the ';
  missing.forEach((field) => {
    if (missing[missing.length - 1] === field && missing.length !== 1) {
      errorString += `and ${field} fields`;
    } else if (missing.length === 1) {
      errorString += `${field} field`;
    } else {
      errorString += `${field}, `;
    }
  });
  return errorString;
};

const checkValidEmail = email => email.match(/[A-z0-9.]+@[A-z]+\.(com|me)/);
const checkEmptyFields = (data) => {
  const emptyFields = {};
  const missingFields = Object.keys(data).filter(field => !data[field] || !/\S/.test(data[field]));
  if (missingFields.length > 0) {
    emptyFields.status = true;
    emptyFields.message = generateErrorMessage(missingFields);
  }
  return emptyFields;
};

const checkExtraFields = (commentDetails, requiredFields) => {
  const requiredFieldsSet = new Set(requiredFields);
  const commentDetailKeys = Object.keys(commentDetails).filter(field => field);
  const invalidList = commentDetailKeys.filter(item => !requiredFieldsSet.has(item));

  return invalidList;
};

const checkFieldLength = (route, fields) => {
  const fieldLength = Object.keys(fields).length;

  if (route === 'signin' && fieldLength > 2) {
    return true;
  }
  if (route === 'signup' && fieldLength > 4) {
    return true;
  }

  if ((route === 'tags' || route === 'reaction') && fieldLength > 1) {
    return true;
  }
  if (route === 'comment' && fieldLength > 5) {
    return true;
  }
  if (route === 'profile' && fieldLength > 2) {
    return true;
  }

  if (route === 'reaction' && fieldLength > 1) {
    return true;
  }

  return false;
};

const alphaNumeric = (inputTxt) => {
  const letterNumber = /((^[0-9]+[a-z]+)|(^[a-z]+[0-9]+))+[0-9a-z]+$/i;
  if (inputTxt.match(letterNumber)) {
    return true;
  }
  return false;
};

exports.checkNullInput = (req, res, next) => {
  let isUndefined = false;
  let isNull = false;
  let isString = true;
  const { title, description, body } = req.body;
  [title, description, body].forEach((field) => {
    if (field === undefined) {
      isUndefined = true;
    }
    if (!isUndefined && !alphaNumeric(field)) {
      if (Number.isInteger(parseFloat(field))) {
        isString = false;
      }
    }
    if (!isUndefined) {
      if (field.trim().length < 1) {
        isNull = true;
      }
    }
  });
  if (isUndefined) {
    return res.status(400).send({ error: 'Invalid Input' });
  }
  if (isNull) {
    return res.status(400).send({ error: 'A field does not contain any input' });
  }
  if (!isString) {
    return res.status(400).send({ error: 'Input cannot be numbers only!' });
  }
  return next();
};
exports.acceptableValues = rules => (req, res, next) => {
  const field = Object.keys(rules)[0];
  const rule = rules[field];
  const acceptableValues = rule.values;
  const suppliedValue = req[rule.keyToUse][field];
  if (acceptableValues.indexOf(suppliedValue) < 0) {
    const errorMessage = acceptableValues
      .reduce((accumulator, currentValue, currentIndex) => {
        if (currentIndex === acceptableValues.length - 1) {
          return `${accumulator}or '${currentValue}'.`;
        }
        return `${accumulator}'${currentValue}', `;
      }, `Set '${field}' to `);
    return res.status(400).send({ error: errorMessage });
  }
  next();
};

// middleware for validating signup fields
exports.validate = route => (req, res, next) => {
  const userDetails = req.body;
  const tooManyFields = checkFieldLength(route, userDetails);
  const emptyFields = checkEmptyFields(userDetails);
  const validEmail = checkValidEmail(userDetails.email);

  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }

  if (!validEmail) {
    return res.status(400).send({ message: 'Please enter a valid email' });
  }
  if (userDetails.password.length < 5) {
    return res.status(400).send({ message: 'Passwords must be greater than four characters' });
  }
  if (tooManyFields) {
    return res.status(400).send({ message: 'Too many fields' });
  }
  next();
};

// middleware for validating passwords
exports.validateResetPassword = (req, res, next) => {
  const emptyFields = checkEmptyFields(req.body);

  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }
  if (req.body.password.length < 5) {
    return res.status(400).send({ message: 'Passwords must be greater than four characters' });
  }
  if (req.body.password.length !== req.body.confirm_password.length) {
    return res.status(400).send({ message: 'Passwords do not match' });
  }

  next();
};

// middleware for validating forgot password
exports.validateForgotPassword = (req, res, next) => {
  const isEmailValid = checkValidEmail(req.body.email);
  const emptyFields = checkEmptyFields(req.body);

  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }

  if (!isEmailValid) {
    return res.status(400).send({ message: "You've entered an invalid email" });
  }

  req.email = req.body.email.trim();
  next();
};

exports.findUserByToken = (req, res, next) => {
  const { token } = req.query;

  if (!token) {
    return res.status(404).send({
      message: 'An account can not be found'
    });
  }

  return User.findOne({
    where: {
      password_reset_token: token,
      password_reset_time: { [operator.gt]: Date.now() }
    }
  }).then((user) => {
    if (!user) {
      return res.status(404).send({
        message: 'An account can not be found'
      });
    }
    req.user = user;
    next();
  });
};
const imageField = (data) => {
  if (Object.keys(data.files).length === 1 && !Object.keys(data.files).includes('image')) {
    return true;
  }
};
const filesFieldLength = (data) => {
  if (Object.keys(data.files).length > 1) {
    return true;
  }
};
const undefinedFields = (data) => {
  const { username, bio } = data;
  if (username === undefined || bio === undefined) {
    return true;
  }
};

const undefinedcommentFields = (data) => {
  const { body } = data;
  if (body === undefined) {
    return true;
  }
};

exports.profileValidation = (req, res, next) => {
  const undefinedFieldError = undefinedFields(req.body);
  if (undefinedFieldError) {
    return res.status(400).send({ message: 'All fields are required' });
  }
  const emptyFields = checkEmptyFields(req.body);
  const tooManyFields = checkFieldLength('profile', req.body);
  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }
  if (tooManyFields) {
    return res.status(400).send({ message: 'Extra field(s) not required' });
  }
  const imageFieldError = imageField(req);
  if (imageFieldError) {
    return res.status(400).send({ message: 'Profile Image is required' });
  }
  const filesFieldLengthError = filesFieldLength(req);
  if (filesFieldLengthError) {
    return res.status(400).send({ message: 'Extra field(s) not required' });
  }
  next();
};

exports.tagValidation = (req, res, next) => {
  const userDetails = req.body;
  const { tags } = userDetails;
  const tooManyFields = checkFieldLength('tags', userDetails);
  const emptyFields = checkEmptyFields({ tags });

  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }

  if (tooManyFields) {
    return res.status(400).send({ message: 'Too many fields' });
  }

  if (!Array.isArray(tags)) {
    return res.status(400).send({ message: 'Tags must be in a list' });
  }

  next();
};

exports.commentValidation = (req, res, next) => {
  let emptyFields;
  const commentDetails = req.body;
  const { status } = req.params;
  const requiredFields = ['body', 'pageId', 'highlight', 'startIndex', 'endIndex'];
  const {
    body,
    pageId,
    highlight,
    startIndex,
    endIndex
  } = commentDetails;

  const undefinedFieldError = undefinedcommentFields(commentDetails);
  const extraFields = checkExtraFields(commentDetails, requiredFields);
  const tooManyFields = checkFieldLength('comment', commentDetails);

  if (!status) {
    emptyFields = checkEmptyFields({ body });
  } else {
    emptyFields = checkEmptyFields({
      body,
      pageId,
      highlight,
      startIndex,
      endIndex
    });
  }

  if (undefinedFieldError) {
    return res.status(400).send({ message: 'All fields are required' });
  }
  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }
  if (tooManyFields || (extraFields.length > 0)) {
    return res.status(400).send({ message: 'Extra field(s) not required' });
  }
  next();
};

exports.reactionValidation = (req, res, next) => {
  const userDetails = req.body;
  const { reaction } = userDetails;
  const emptyFields = checkEmptyFields(req.body);
  const tooManyFields = checkFieldLength('reaction', userDetails);

  if (emptyFields.status) {
    return res.status(400).send({ message: emptyFields.message });
  }

  if (tooManyFields) {
    return res.status(400).send({ message: 'Too many fields' });
  }
  if (reaction !== 1 && reaction !== -1 && !Number.isNaN(reaction)) {
    return res.status(400).send({ message: 'Incorrect reaction value provided' });
  }

  next();
};

exports.validateRating = (req, res, next) => {
  const ratingNumber = parseInt(req.query.ratingNumber, 10);

  if (!req.query.ratingNumber) {
    return res.status(400).send({
      errors: 'Please enter a rating number from 1 to 5'
    });
  }

  if (Number.isNaN(ratingNumber)) {
    return res.status(400).send({
      errors: `Your rating must be a number: ${req.query.ratingNumber}`
    });
  } if (ratingNumber > 5) {
    return res.status(400).send({
      errors:
      'You can\'t rate an article above 5 star'
    });
  }

  req.ratingNumber = ratingNumber;
  next();
};

exports.searchValidation = (req, res, next) => {
  const checkField = checkEmptyFields(req.query);

  if (checkField.status) {
    return res.status(400).send({ message: checkField.message });
  }

  next();
};
