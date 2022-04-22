DROP TABLE IF EXISTS covid;

CREATE TABLE covid (

  date DATE NOT NULL,
  state TEXT NOT NULL,
  county TEXT NOT NULL,
  fips INTEGER NOT NULL,
  cases INTEGER,
  vaccinations INTEGER,
  PRIMARY KEY (fips, date)
);
