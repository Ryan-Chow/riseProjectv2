CREATE TABLE leagues(
    leagueName  varchar,
    leagueID    varchar,
    username    varchar,
    permission  varchar
);


CREATE TABLE activity(
    leagueID    varchar,
    activity    varchar,
    activityID  varchar,
    time        timestamp with time zone,
    type        varchar,
    status      varchar,
    username    varchar
);


CREATE TABLE filters(
    username    varchar,
    skill       varchar[],
    cause       varchar[],
    virtual     boolean
);

CREATE TABLE activeTask(
    leagueID    varchar,
    username    varchar,
    title       varchar,
    description varchar,
    link        varchar
);

CREATE TABLE taskArchive(
    leagueID    varchar,
    username    varchar,
    title       varchar,
    description varchar,
    link        varchar
);

CREATE TABLE game (
    leagueID    varchar,
    username    varchar,
    currency    int,
    multiplier  float,
    level       int
);