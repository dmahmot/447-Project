"""__init__.py: main application file"""

from datetime import date, timedelta, datetime
from distutils.command.build_scripts import first_line_re
import os
from numpy import true_divide
import pandas as pd         # used for csv
from flask import *
from pytz import country_timezones         # used for displaying website
from . import db
import json

# global constants
URL_INFECT = 'https://opendata.maryland.gov/api/views/tm86-dujs/rows.csv?accessType=DOWNLOAD'
URL_VACCINE = 'https://opendata.maryland.gov/api/views/4ibg-xizv/rows.csv?accessType=DOWNLOAD'
URL_TOTAL_POP = 'https://opendata.maryland.gov/api/views/r7ky-rq9s/rows.csv?accessType=DOWNLOAD'
CSV_INFECT = 'MD_COVID-19_-_Cases_by_County.csv'
CSV_VACCINE = 'MD_COVID-19_-_Vaccinations_by_County.csv'

URL_CURR_STATES = 'https://api.covidactnow.org/v2/states.csv?apiKey=fc20e15ab3024b65939c396e1c2f0761'
URL_CURR_COUNTIES = 'https://api.covidactnow.org/v2/counties.csv?apiKey=fc20e15ab3024b65939c396e1c2f0761'
URL_DATE_STATES = 'https://api.covidactnow.org/v2/states.timeseries.csv?apiKey=fc20e15ab3024b65939c396e1c2f0761'
URL_DATE_COUNTIES = 'https://api.covidactnow.org/v2/counties.timeseries.csv?apiKey=fc20e15ab3024b65939c396e1c2f0761'
CSV_DATE_COUNTIES = 'counties.timeseries.csv'


# global variables
hasBeenLaunched = False
data_master = None
data_infect = None
data_vaccine = None

list_counties = None
list_states = None

headings = ('Category', 'Value')
data = []

statesJson = None
countiesJson = None

test_config = None

# create and configure the app
app = Flask(__name__, instance_relative_config=True)
app.config.from_mapping(
    SECRET_KEY='dev',
    DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
  )

if test_config is None:
    # load the instance config, if it exists, when not testing
    app.config.from_pyfile('config.py', silent=True)
else:
    # load the test config if passed in
    app.config.from_mapping(test_config)

# ensure the instance folder exists
try:
    os.makedirs(app.instance_path)
except OSError:
    pass

from . import db
db.init_app(app)


def fipsSort(obj):
    return obj['fips']

# query database and write to json file with data
def writeDataToFiles():

    global statesJson, countiesJson
    db_cursor = db.get_db().cursor()

    # load json files
    f = open('states_data.json')
    statesJson = json.load(f)
    f.close()

    f = open('counties_data.json')
    countiesJson = json.load(f)
    f.close()

    date_to_use = date(2022, 4, 12).isoformat()

    # get one row from each county, from the most recent date - sorted by fips
    db_cursor.execute(""" SELECT * FROM covid
                                    WHERE date = ? ORDER BY fips DESC; """, (str(date_to_use),))

    # sort rows in order of fips codes
    query_res = db_cursor.fetchall()

    # **** COUNTIES_DATA.JSON["FEATURES"] NEEDS TO BE SORTED 
    #      BY "id" IN ORDER FOR THIS TO WORK **** 

    # key - 5 digit "fips"
    # val = list w/ 2 elements [vacc_data, cases data]
    query_dict = {}

    # store data in dictionary to transfer to json
    for row in query_res:
        row_id = str(row["fips"])
        if len(row_id) == 4:
            row_id = '0' + row_id

        query_dict[row_id] = [row["vaccinations"], row["cases"]]
    

    # how many days in the past will we search if null data is found 
    NULL_LIMIT = 3
    
    for county in countiesJson["features"]:

        num_times_null_vacc = 0
        num_times_null_cases = 0
        vacc_data = None
        cases_data = None

        county_key = county["id"]
        dict_obj = query_dict.get(county_key)

        # if there's no key error from dict 
        if dict_obj:
            vacc_data = dict_obj[0]
            cases_data = dict_obj[1]
        

        # if vacc data is not null
        if vacc_data:
            county["properties"]["vaccinations"] = vacc_data

        # search previous days for non null data
        else:
            # '0123-56-89' - capture the date we're using in a separate datetime variable
            new_date = datetime(int(date_to_use[0:4]), int(date_to_use[5:7]), int(date_to_use[8:10]))

            # loop until either non null data is found, or the limit we set to look for null data has been met
            while (vacc_data is None) and (num_times_null_vacc < NULL_LIMIT):
                # decrement day by 1 day
                new_date = str((new_date - timedelta(days=1)))[0:10] 

                # find non null data. searches for a row on the exact 'new_date' with the exact fips code
                db_cursor.execute(""" SELECT * FROM covid
                                                WHERE fips = ? AND date = ? LIMIT 1; """, (county['id'],new_date,))
                # get the query result
                temp_query_new_row = db_cursor.fetchone()                                                

                # save vacc data from query result into variable
                if temp_query_new_row:
                    vacc_data = temp_query_new_row['vaccinations']
                
                # make 'new_date' a datetime object
                new_date = datetime(int(new_date[0:4]), int(new_date[5:7]), int(new_date[8:10]))

                num_times_null_vacc = num_times_null_vacc + 1

            # once out of while loop, save vacc data to json variable
            county["properties"]["vaccinations"] = vacc_data


        # if case data is not null
        if cases_data:
            county["properties"]["cases"] = cases_data
        
        # search previous days for non null data
        else:
            # '0123-56-89' - capture the date we're using in a separate datetime variable
            new_date = datetime(int(date_to_use[0:4]), int(date_to_use[5:7]), int(date_to_use[8:10]))

            # loop until either non null data is found, or the limit we set to look for null data has been met
            while (vacc_data is None) and (num_times_null_cases < NULL_LIMIT):
                # decrement day by 1 day
                new_date = str((new_date - timedelta(days=1)))[0:10] 

                # find non null data. searches for a row on the exact 'new_date' with the exact fips code
                db_cursor.execute(""" SELECT * FROM covid
                                                WHERE fips = ? AND date = ? LIMIT 1; """, (county['id'],new_date,))
                # get the query result
                temp_query_new_row = db_cursor.fetchone()                                                

                # save cases data from query result into variable
                if temp_query_new_row:
                    vacc_data = temp_query_new_row['cases']
                
                # make 'new_date' a datetime object
                new_date = datetime(int(new_date[0:4]), int(new_date[5:7]), int(new_date[8:10]))

                num_times_null_cases = num_times_null_cases + 1

            # once out of while loop, save vacc data to json variable
            county["properties"]["cases"] = cases_data

    
def my_request():
    """
    Downloads files from online database to populate dataframe
    :return:
    """
    # make sure to use global variables instead of initializing new local ones
    global data_master, data_infect, data_vaccine, list_states, list_counties, hasBeenLaunched

    # only get the needed columns or else it would take too long to load the entire csv
    data_master = pd.read_csv(CSV_DATE_COUNTIES, usecols=['date', 'state', 'county', 'fips' , 'actuals.cases', 'actuals.vaccinationsCompleted'])
    data_master = data_master.rename(columns={'actuals.cases': 'cases', 'actuals.vaccinationsCompleted': 'vaccinations'})
       
    # populate database
    data_master.to_sql("covid", db.get_db(), if_exists="replace", index=False)
    
    # get list of states
    list_states = pd.read_csv(URL_CURR_STATES, usecols=['state'])
    list_states = list_states['state'].to_numpy()

    # load and write to json fileS, inserting data
    writeDataToFiles();

    # get list of counties with their states
    list_counties = pd.read_csv(URL_CURR_COUNTIES, usecols=['state', 'county'])

    # set flag to true to indicate database is populated
    hasBeenLaunched = True


@app.route('/', methods=('GET', 'POST'))
def home_page():
    """
    Link to home page
    :return:
    """
    global hasBeenLaunched, statesJson, countiesJson

    if request.method == 'GET':
        if not hasBeenLaunched:
            # load dataframe from csv
            my_request()
        # print("making dummy stuff...")
        # list_states = ['nothing', 'temp']            

        # run home page, set headers to dropdown list options
        return render_template('home.html', states=list_states, statesJson=statesJson, countiesJson=countiesJson)
    
    # post method
    else:
        input_state = request.form['state']
        return redirect(url_for("select_county", state=input_state))


@app.route('/get/<state>', methods=('GET', 'POST'))
def select_county(state):
    """
    Link to select county
    :return:
    """

    if not hasBeenLaunched:
        print("redirecting to home.")
        return redirect(url_for('home_page'))

    db_cursor = db.get_db().cursor()

    if request.method == 'GET':
        # get a list of counties specific to chosen state
        state_counties = list_counties.loc[list_counties['state'] == state]
        state_counties = state_counties['county'].to_numpy()

        # get state db object
        current_state_db = db_cursor.execute(""" SELECT * FROM covid
                                         WHERE state = ?;  """, (state,))
               


        # run search county page, set headers to dropdown list options
        return render_template('select_county.html', state=state, counties=state_counties)

    # post method
    else:
        # receive input on which county to select
        input_county = request.form['county']

        # search for chosen county
        if (search_county(state, input_county) is None):
            return redirect(url_for('county_error', county=input_county))

        # go to county dataframe page
        return redirect(url_for('county', county=input_county, state=state))


@app.route('/get/county/<county>/<state>')
def county(county, state):
    """
    Link to county dataframe
    :return:
    """
    global hasBeenLaunched
    
    if not hasBeenLaunched:
        return redirect(url_for('home_page'))
    
    return render_template('county.html', headings=headings, data=data, county=county, state=state)


@app.route('/county_error/<county>')
def county_error(county):
    
    # flashes error message to user after redirect to homepage
    flash("Whoops! Couldn't find '%s' county in the database." % county, 'error')
    return redirect(url_for('home_page'))



# the parameter query_results is a list containing Row elements from a state/county database query
# each element has keys : 'date', 'state', 'county', 'fips', 'cases', 'vaccinations'
def county_stats(query_results):
    """
    Displays dataframe for chosen county
    (currently as a table in alphabetical order)
    :param county: string of the chosen county
    :param dataframe: the given infected dataframe
    :return:
    """
    # infection rate per capita = (infected / total population) * 100
    # test positivity rate = (positive result / total tested) * 100
    # test per capita = (total tests / total population) * 100
    # case fatality rate = (deaths / infected) * 100
    global data

    # calculate statistics for chosen county

    if(len(query_results) != 0):
        cases_cumulative = query_results.pop()['cases']
        cases_last_7 = query_results.pop()['cases'] - query_results.pop(-7)['cases']
    else:
        cases_cumulative = None
        cases_last_7 = None

    if(len(query_results) != 0):
        vac_cumulative = query_results.pop()['vaccinations']
        vac_last_7 =  query_results.pop()['vaccinations'] - query_results.pop(-7)['vaccinations']
    else:
        vac_cumulative = None
        vac_last_7 = None

    # create table to be displayed
    data = [
        ('Cumulative cases', str(cases_cumulative)),
        ('Cases last 7 days', str(cases_last_7)),
        ('Cumulative vaccinations', str(vac_cumulative)),
        ('Vaccinations last 7 days', str(vac_last_7))
    ]

# sort function to use in search_county()
# returns the 'date' value of the row object to use as a key to sort
def dateKey(obj):
    return obj['date']

def search_county(state, county):
    """
    Finds the given county in the infected dataframe
    Returns error if not found
    :param county: string of the chosen county
    :return:
    """

    db_cursor = db.get_db().cursor()

    # get a list of counties specific to chosen state
    state_counties = list_counties.loc[list_counties['state'] == state]

    # get a list of entries for that specific county
    state_counties = state_counties.loc[state_counties['county'] == county]

    # convert dataframe into a list
    state_counties = state_counties['county'].to_numpy()

    # attempt to find chosen county
    if county in state_counties:
        
        # query database for all dates from specified county
        db_cursor.execute(""" SELECT * FROM covid
                                    WHERE state = ? AND  county = ?; """, (state, county))

        # get all query results
        query_results = db_cursor.fetchall()

        # sort entries by date
        query_results.sort(key=dateKey)

        county_stats(query_results)

        return 1
    else:
        return None


if __name__ == '__main__':
    # create and configure the app
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY='dev',
        DATABASE=os.path.join(app.instance_path, 'flaskr.sqlite'),
    )

    if test_config is None:
        # load the instance config, if it exists, when not testing
        app.config.from_pyfile('config.py', silent=True)
    else:
        # load the test config if passed in
        app.config.from_mapping(test_config)

    # ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    from . import db
    db.init_app(app)

    # create_app(None)
    app.run(debug=True)
