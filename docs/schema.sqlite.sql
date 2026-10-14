-- Generated from backend/app/models.py. Initialize local DB using manage.py init.

CREATE TABLE challenges (
	id INTEGER NOT NULL, 
	title VARCHAR(160) NOT NULL, 
	description VARCHAR(4000) NOT NULL, 
	points INTEGER NOT NULL, 
	opens_at INTEGER NOT NULL, 
	closes_at INTEGER NOT NULL, 
	active BOOLEAN NOT NULL, 
	PRIMARY KEY (id)
);

CREATE TABLE rate_buckets (
	"key" VARCHAR(128) NOT NULL, 
	count INTEGER NOT NULL, 
	PRIMARY KEY ("key")
);

CREATE TABLE teams (
	id INTEGER NOT NULL, 
	name VARCHAR(80) NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE TABLE solves (
	id INTEGER NOT NULL, 
	team_id INTEGER NOT NULL, 
	challenge_id INTEGER NOT NULL, 
	points INTEGER NOT NULL, 
	created INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT one_solve_per_team UNIQUE (team_id, challenge_id), 
	FOREIGN KEY(team_id) REFERENCES teams (id), 
	FOREIGN KEY(challenge_id) REFERENCES challenges (id)
);

CREATE TABLE users (
	id INTEGER NOT NULL, 
	username VARCHAR(80) NOT NULL, 
	password_hash VARCHAR(512) NOT NULL, 
	team_id INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (username), 
	FOREIGN KEY(team_id) REFERENCES teams (id)
);

CREATE TABLE sessions (
	token_hash VARCHAR(64) NOT NULL, 
	user_id INTEGER NOT NULL, 
	csrf_hash VARCHAR(64) NOT NULL, 
	expires INTEGER NOT NULL, 
	PRIMARY KEY (token_hash), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE TABLE submissions (
	id INTEGER NOT NULL, 
	team_id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	challenge_id INTEGER NOT NULL, 
	correct BOOLEAN NOT NULL, 
	created INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(team_id) REFERENCES teams (id), 
	FOREIGN KEY(user_id) REFERENCES users (id), 
	FOREIGN KEY(challenge_id) REFERENCES challenges (id)
);
