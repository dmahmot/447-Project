"""app.py: main application file"""

import requests             # used for downloading files from websites
import pandas as pd         # used for csv
from flask import *         # used for displaying website

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

# global variables
data_master = None
data_infect = None
data_vaccine = None

list_counties = None
list_states = None

headings = ('Category', 'Value')
data = []

app = Flask(__name__)

# secret_key needs to be set to use session - message flashing uses session
app.secret_key = "meaningless text"


def my_request():
    """
    Downloads files from online database to populate dataframe
    :return:
    """
    # make sure to use global variables instead of initializing new local ones
    global data_master, data_infect, data_vaccine, list_states, list_counties

    # only get the needed columns or else it would take too long to load the entire csv
    data_master = pd.read_csv(URL_DATE_COUNTIES, usecols=['date', 'state', 'county', 'actuals.cases', 'actuals.vaccinationsCompleted'])
    #data_infect = data_master[['date', 'state', 'county', 'actuals.cases']]
    #data_vaccine = data_master[['date', 'state', 'county', 'actuals.vaccinationsCompleted']]

    # get list of states
    list_states = pd.read_csv(URL_CURR_STATES, usecols=['state'])
    list_states = list_states['state'].to_numpy()

    # get list of counties with their states
    list_counties = pd.read_csv(URL_CURR_COUNTIES, usecols=['state', 'county'])


@app.route('/', methods=('GET', 'POST'))
def home_page():
    """
    Link to home page
    :return:
    """
    if request.method == 'GET':
        if data_master is None:
            # load dataframe from csv
            my_request()

        # run home page, set headers to dropdown list options
        return render_template('home.html', states=list_states)
    
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
    if request.method == 'GET':
        # get a list of counties specific to chosen state
        state_counties = list_counties.loc[list_counties['state'] == state]
        state_counties = state_counties['county'].to_numpy()

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
        return redirect(url_for('county', county=input_county))


@app.route('/get/county/<county>')
def county(county):
    """
    Link to county dataframe
    :return:
    """
    return render_template('county.html', headings=headings, data=data, county=county)


@app.route('/county_error/<county>')
def county_error(county):
    
    # flashes error message to user after redirect to homepage
    flash("Whoops! Couldn't find '%s' county in the database." % county, 'error')
    return redirect(url_for('home_page'))


def county_stats(dataframe):
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
    cases_cumulative = dataframe['actuals.cases'].values[-1]
    cases_last_7 = dataframe['actuals.cases'].values[-1] - dataframe['actuals.cases'].values[-7]
    vac_cumulative = dataframe['actuals.vaccinationsCompleted'].values[-1]
    vac_last_7 = dataframe['actuals.vaccinationsCompleted'].values[-1] - dataframe['actuals.vaccinationsCompleted'].values[-7]

    # create table to be displayed
    data = [
        ('Cumulative cases', str(cases_cumulative)),
        ('Cases last 7 days', str(cases_last_7)),
        ('Cumulative vaccinations', str(vac_cumulative)),
        ('Vaccinations last 7 days', str(vac_last_7))
    ]


def search_county(state, county):
    """
    Finds the given county in the infected dataframe
    Returns error if not found
    :param county: string of the chosen county
    :return:
    """

    # get a list of counties specific to chosen state
    state_counties = list_counties.loc[list_counties['state'] == state]

    # get a list of entries for that specific county
    state_counties = state_counties.loc[state_counties['county'] == county]

    # convert dataframe into a list
    state_counties = state_counties['county'].to_numpy()

    # attempt to find chosen county
    if county in state_counties:
        # if county is found, create new dataframe for just that county

        # get a list of entries specific to chosen state
        data_county = data_master.loc[data_master['state'] == state]

        # get a list of entries for that specific county
        data_county = data_county.loc[data_county['county'] == county]
                
        # remove NA entries of that county
        data_county = data_county.dropna()

        # sort entries by date
        data_county = data_county.sort_values(by='date')

        # print dataframe of chosen county
        county_stats(data_county)

        return 1
    else:
        return None


if __name__ == '__main__':
    app.run(debug=True)
