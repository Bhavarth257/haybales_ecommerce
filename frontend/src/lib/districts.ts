// Approximate district headquarters coordinates (demo-grade) for Punjab and Haryana.
// Used when a user picks a district instead of sharing GPS. Other states: GPS or manual entry.
export const DISTRICTS: Record<string, Record<string, [number, number]>> = {
  Punjab: {
    Amritsar: [31.634, 74.872], Barnala: [30.374, 75.548], Bathinda: [30.211, 74.945], Faridkot: [30.675, 74.756],
    'Fatehgarh Sahib': [30.648, 76.39], Fazilka: [30.403, 74.028], Ferozepur: [30.925, 74.613], Gurdaspur: [32.04, 75.403],
    Hoshiarpur: [31.532, 75.917], Jalandhar: [31.326, 75.576], Kapurthala: [31.38, 75.38], Ludhiana: [30.901, 75.857],
    Mansa: [29.998, 75.393], Moga: [30.817, 75.171], Mohali: [30.704, 76.717], Muktsar: [30.474, 74.516],
    Pathankot: [32.274, 75.652], Patiala: [30.34, 76.386], Rupnagar: [30.966, 76.533], Sangrur: [30.245, 75.844],
    'Nawanshahr': [31.125, 76.116], 'Tarn Taran': [31.452, 74.928], Malerkotla: [30.531, 75.879],
  },
  Haryana: {
    Ambala: [30.378, 76.776], Bhiwani: [28.793, 76.139], 'Charkhi Dadri': [28.592, 76.271], Faridabad: [28.408, 77.317],
    Fatehabad: [29.515, 75.455], Gurugram: [28.459, 77.026], Hisar: [29.149, 75.721], Jhajjar: [28.607, 76.656],
    Jind: [29.316, 76.315], Kaithal: [29.801, 76.4], Karnal: [29.686, 76.99], Kurukshetra: [29.969, 76.878],
    Mahendragarh: [28.284, 76.15], Nuh: [28.106, 77.002], Palwal: [28.144, 77.326], Panchkula: [30.694, 76.861],
    Panipat: [29.391, 76.963], Rewari: [28.197, 76.617], Rohtak: [28.895, 76.607], Sirsa: [29.534, 75.029],
    Sonipat: [28.993, 77.016], Yamunanagar: [30.129, 77.267],
  },
};
// Punjab and Haryana first (where most stubble is burned), then every other state and union territory A–Z.
export const STATES = [
  'Punjab', 'Haryana',
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry',
];

/** Fallback point per state (capital or a central city) when the district isn't in DISTRICTS and GPS isn't shared. Distances are then approximate. */
export const STATE_CENTRES: Record<string, [number, number]> = {
  Punjab: [30.901, 75.857], Haryana: [28.895, 76.607], 'Andhra Pradesh': [16.51, 80.52], 'Arunachal Pradesh': [27.08, 93.61],
  Assam: [26.14, 91.79], Bihar: [25.59, 85.14], Chhattisgarh: [21.25, 81.63], Goa: [15.49, 73.83], Gujarat: [23.22, 72.65],
  'Himachal Pradesh': [31.1, 77.17], Jharkhand: [23.34, 85.31], Karnataka: [12.97, 77.59], Kerala: [8.52, 76.94],
  'Madhya Pradesh': [23.26, 77.41], Maharashtra: [18.52, 73.86], Manipur: [24.82, 93.94], Meghalaya: [25.58, 91.89],
  Mizoram: [23.73, 92.72], Nagaland: [25.67, 94.11], Odisha: [20.3, 85.82], Rajasthan: [26.91, 75.79], Sikkim: [27.33, 88.61],
  'Tamil Nadu': [13.08, 80.27], Telangana: [17.39, 78.49], Tripura: [23.83, 91.29], 'Uttar Pradesh': [26.85, 80.95],
  Uttarakhand: [30.32, 78.03], 'West Bengal': [22.57, 88.36], 'Andaman and Nicobar Islands': [11.62, 92.73],
  Chandigarh: [30.73, 76.78], 'Dadra and Nagar Haveli and Daman and Diu': [20.4, 72.83], Delhi: [28.61, 77.21],
  'Jammu and Kashmir': [34.08, 74.8], Ladakh: [34.15, 77.58], Lakshadweep: [10.57, 72.64], Puducherry: [11.94, 79.81],
};
