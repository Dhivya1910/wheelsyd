from flask import Flask, request, jsonify
import lightgbm as lgb
import numpy as np
import pandas as pd
from scipy.spatial import KDTree
from datetime import datetime
import logging
from flask_cors import CORS
import ast

# ========== Configuration ==========
app = Flask(__name__)
CORS(app)
model = lgb.Booster(model_file='model.txt')
geolocator = Nominatim(user_agent="geo_locator")

# Loading data file and KDTree
sensors_df = pd.read_csv("sensors.csv")
history_df = pd.read_csv("lookupdata.csv")
def parse_location(loc_str):
    loc_dict = ast.literal_eval(loc_str)
    return (loc_dict['lon'], loc_dict['lat'])

coord_list = sensors_df['location'].apply(parse_location).tolist()
tree = KDTree(coord_list)

# Holidays
pHOLIDAYS = {
    "2025-01-01", "2025-01-27", "2025-03-10", "2025-04-18", "2025-04-19",
    "2025-04-20", "2025-04-21", "2025-04-25", "2025-06-09", "2025-09-26",
    "2025-11-04", "2025-12-25", "2025-12-26", "2026-01-01", "2026-01-26",
    "2026-03-09", "2026-04-03", "2026-04-04", "2026-04-05", "2026-04-06",
    "2026-04-25", "2026-06-08", "2026-11-03", "2026-12-25", "2026-12-26",
    "2026-12-28"
}

# ========== Function Tools ==========

def get_location_id(address):
    try:
        match = sensors_df[sensors_df['sensor_description'] == address]
        if not match.empty:
            return match.iloc[0]['location_id']
        else:
            return None
    except Exception as e:
        logging.error(f"Geocoding error: {e}")
        return None

def get_last_year_same_hour(location_id, date_str, hour):
    history_df['Sensing_Date'] = pd.to_datetime(history_df['Sensing_Date'])
    last_year_date = datetime.strptime(date_str, "%Y-%m-%d") - pd.DateOffset(years=1)
    last_year_data = history_df[
        (history_df['Location_ID'] == location_id) &
        (history_df['Sensing_Date'].dt.date == last_year_date.date()) &
        (history_df['HourDay'] == hour)
    ]
    if not last_year_data.empty:
        return last_year_data.iloc[0]['Total_of_Directions']
    return 0

def is_public_holiday(date_str):
    return int(date_str in pHOLIDAYS)

# ========== Routing ==========
@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        address = data.get('address')
        hour_str = data.get('hour')
        date_str = data.get('date')
        if not address or not hour_str or not date_str:
            return jsonify({'error': 'Missing parameters'}), 400

        HourDay = int(hour_str)
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_of_week = date_obj.weekday()
        is_weekend = int(day_of_week >= 5)
        is_holiday = is_public_holiday(date_str)

        location_id = get_location_id(address)
        if location_id is None:
            return jsonify({'error': 'Address not found'}), 400

        last_year_same_hour = get_last_year_same_hour(location_id, date_str, HourDay)

        features = [
            location_id, HourDay, day_of_week,
            is_holiday, is_weekend, last_year_same_hour
        ]
        inputs = np.array([features])
        preds = model.predict(inputs)

        return jsonify({'predictions': preds.tolist()})

    except Exception as e:
        logging.exception("Prediction error")
        return jsonify({'error': str(e)}), 500

# ========== Start ==========
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, ssl_context=('fullchain.pem', 'privkey.pem'))