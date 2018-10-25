module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User', {
      firstname: {
        type: DataTypes.STRING,
        allowNull: false
      },

      lastname: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false
      },
      account_type: {
        type: DataTypes.ENUM,
        defaultValue: 'Local',
        values: ['Local', 'google', 'facebook', 'twitter']
      },
      verification_token: {
        type: DataTypes.STRING,
        allowNull: true
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      password_reset_token: {
        type: DataTypes.STRING,
      },
      password_reset_time: {
        type: DataTypes.DATE,
      },
      role: {
        type: DataTypes.ENUM,
        defaultValue: 'User',
        values: ['Admin', 'User', 'Visitor']
      },
      notificationSettings: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: ['email', 'inApp']
      },
    },
    {}
  );
  User.associate = (models) => {
    User.hasOne(models.Profiles, { as: 'profile', foreignKey: 'userId' });
    User.hasMany(models.FollowersTable, {
      foreignKey: 'followedUserId'
    });
    User.hasMany(models.FollowersTable, {
      foreignKey: 'followerId'
    });
    User.hasMany(models.Bookmark, {
      foreignKey: 'userId'
    });
    User.hasMany(models.ArticleComment, {
      foreignKey: 'user_id'
    });
    User.hasMany(models.CommentReply, {
      foreignKey: 'user_id'
    });
    User.hasMany(models.CommentReaction, {
      foreignKey: 'user_id'
    });
    User.hasMany(models.FavoriteArticle, {
      foreignKey: 'user_id'
    });
  };
  return User;
};
