function gravatarify(user) {
  var base_url = "//www.gravatar.com/avatar/";
  var params = "?d=identicon&r=pg&s=200";

  if (user.config && user.config.gravatar) {
    return base_url + user.config.gravatar + params;
  }

  return base_url + user.display + params;
}

export {
  gravatarify
};
