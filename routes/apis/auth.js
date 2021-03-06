const router = require('express').Router();
const bcrypt = require('bcryptjs');
const config = require('config');
const jwt = require('jsonwebtoken');
const auth = require('../../middleware/auth.js');

const User = require('../../models/User.js');

// @route GET api/auth/user
// @desc GET a user
// @access Private

router.get('/user', auth, (req, res) => {
	User.findById(req.user.id)
		.select('-password')
		.then(user => {
			return res.status(200).json(user);
		})
});

// @route POST api/auth
// @desc Authorize a user
// @access Public
router.post('/', (req, res) => {
	const username = req.body.username;

	if (!username) {
		return res.status(400).json({ msg: 'Please enter your credentials.' });
	}

	User.findOne({ username })
		.then(
			user => {
				if (!user) {
					return res.status(404).json({ msg: 'User not found.' });
				}

				var ip = req.ip;

				if (ip !== undefined && ip !== null) {
					ip = ip.split(':').pop();

					if (ip !== null && user.remotes.indexOf(ip) !== -1) {
						return jwt.sign({ id: user.id },
							config.get('jwtSecret'),
							{ expiresIn: 3600 },
							(err, token) => {
								return res.status(200).json({
									token,
									user: {
										name: user.name,
										username: user.username,
										joinDate: user.joinDate
									}
								})
							}
						);
					}
				}

				const password = req.body.password;

				if (!password) {
					return res.status(400).json({ msg: 'Please enter your credentials.' });
				}
				
				bcrypt.compare(password, user.password)
					.then(
						isMatch => {
							if (!isMatch) {
								return res.status(400).json({ msg: 'Invalid credentials. '});
							}

							user.remotes.push(ip);
							user.save()
								.then(user => {
									jwt.sign(
										{ id: user.id },
										config.get('jwtSecret'),
										{ expiresIn: 3600 },
										(err, token) => {
											return res.status(200).json({
												token,
												user: {
													name: user.name,
													username: user.username,
													joinDate: user.joinDate
												}
											})
										}
									);
								});
						}
					)
			}
		)
});

// @route DELETE api/auth
// @desc Eject an authorization
// @access Public

router.delete('/', auth, (req, res) => {
	const id = req.user.id;

	if (!id) {
		return res.status(400).json({ msg: 'Bad request.' });
	}

	User.findById(id)
		.then(
			user => {
				if (!user) {
					return res.status(404).json({ msg: 'User not found.' });
				}

				var ip = req.ip;

				if (!ip) {
					return res.status(400).json({ msg: 'Bad request.' });
				} else {
					ip = ip.split(':').pop();

					if (!ip) {
						return res.status(400).json({ msg: 'Bad request.' });
					}
				}

				const index = user.remotes.indexOf(ip);

				if (index === -1) {
					return res.status(400).json({ msg: 'Bad request.' });
				}

				user.remotes.splice(index, 1);
				user.save()
					.then(() => {
						return res.status(200).json({ msg: 'Ejected.' });
					});
			}
		);
});

module.exports = router;