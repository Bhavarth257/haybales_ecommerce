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
export const STATES = ['Punjab', 'Haryana', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Other'];
