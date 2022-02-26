"""app.py: main application file"""

import requests             # used for downloading files from websites
import pandas as pd         # used for csv

# global constants
URL_INFECT = 'https://opendata.maryland.gov/api/views/tm86-dujs/rows.csv?accessType=DOWNLOAD'
URL_VACCINE = 'https://opendata.maryland.gov/api/views/4ibg-xizv/rows.csv?accessType=DOWNLOAD'
CSV_INFECT = 'MD_COVID-19_-_Cases_by_County.csv'
CSV_VACCINE = 'MD_COVID-19_-_Vaccinations_by_County.csv'

# global variables
data_infect = None
data_vaccine = None


def request():
    """
    Downloads files from online database to populate dataframe
    :return:
    """
    # make sure to use global variables instead of initializing new local ones
    global data_infect
    global data_vaccine

    data_infect = pd.read_csv(CSV_INFECT)
    #data_vaccine = pd.read_csv(csv_vaccine)

    # drop the OBJECTID column
    data_infect = data_infect.drop('OBJECTID', axis=1)


def print_data(dataframe):
    """
    Displays given dataframe
    (currently as a table in alphabetical order)
    :param dataframe: the chosen dataframe
    :return:
    """
    # temp: print first 5 rows of dataframe
    print(dataframe.head(5))

def calc_rate(dataframe):
    """
    Calculates rate
    :param dataframe: the chosen dataframe
    :return:
    """
    # infection rate = (# infected / total population) * 100
    


if __name__ == '__main__':
    request()
    print_data(data_infect)
    calc_rate(data_infect)
