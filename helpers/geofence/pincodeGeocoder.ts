/**
 * Indian Pincode & City Geocoding Engine
 * 
 * Maps Indian postal PIN codes to high-precision latitude & longitude coordinates.
 * Includes exact 6-digit dictionary for key hubs and districts (including 502110 Medak),
 * accurate 3-digit district sorting prefix routing, and dynamic Nominatim / Postal API caching.
 */

export interface PincodeCoordinates {
  latitude: number;
  longitude: number;
  area?: string;
  city?: string;
  state?: string;
}

// Built-in high-precision dictionary for common PIN codes
const KNOWN_PINCODES: Record<string, PincodeCoordinates> = {
  // Medak, Sangareddy & Siddipet District (502xxx)
  '502110': { latitude: 18.0490, longitude: 78.2673, area: 'Medak Town / HPO', city: 'Medak', state: 'Telangana' },
  '502001': { latitude: 17.6190, longitude: 78.0818, area: 'Sangareddy Head Post Office', city: 'Sangareddy', state: 'Telangana' },
  '502103': { latitude: 18.1018, longitude: 78.8520, area: 'Siddipet Town', city: 'Siddipet', state: 'Telangana' },
  '502319': { latitude: 17.5332, longitude: 78.2652, area: 'Patancheru', city: 'Sangareddy', state: 'Telangana' },
  '502220': { latitude: 17.6817, longitude: 77.6080, area: 'Zaheerabad', city: 'Sangareddy', state: 'Telangana' },
  '502248': { latitude: 17.5020, longitude: 78.2890, area: 'BHEL / RC Puram', city: 'Sangareddy', state: 'Telangana' },
  '502313': { latitude: 17.7420, longitude: 78.2810, area: 'Narsapur', city: 'Medak', state: 'Telangana' },
  '502270': { latitude: 17.8520, longitude: 78.6830, area: 'Gajwel', city: 'Siddipet', state: 'Telangana' },
  '502102': { latitude: 17.9250, longitude: 78.1320, area: 'Jogipet / Andole', city: 'Sangareddy', state: 'Telangana' },
  '502334': { latitude: 17.7010, longitude: 78.0210, area: 'Sadasivpet', city: 'Sangareddy', state: 'Telangana' },
  '502279': { latitude: 17.5140, longitude: 78.2880, area: 'Ramachandrapuram', city: 'Sangareddy', state: 'Telangana' },

  // Hyderabad & Secunderabad (500xxx)
  '500016': { latitude: 17.4381, longitude: 78.4559, area: 'Ameerpet / Begumpet', city: 'Hyderabad', state: 'Telangana' },
  '500038': { latitude: 17.4435, longitude: 78.4411, area: 'SR Nagar', city: 'Hyderabad', state: 'Telangana' },
  '500072': { latitude: 17.4947, longitude: 78.3996, area: 'Kukatpally', city: 'Hyderabad', state: 'Telangana' },
  '500081': { latitude: 17.4483, longitude: 78.3915, area: 'Madhapur / Hitech City', city: 'Hyderabad', state: 'Telangana' },
  '500032': { latitude: 17.4401, longitude: 78.3489, area: 'Gachibowli', city: 'Hyderabad', state: 'Telangana' },
  '500033': { latitude: 17.4325, longitude: 78.4071, area: 'Jubilee Hills', city: 'Hyderabad', state: 'Telangana' },
  '500034': { latitude: 17.4170, longitude: 78.4430, area: 'Banjara Hills', city: 'Hyderabad', state: 'Telangana' },
  '500003': { latitude: 17.4399, longitude: 78.4983, area: 'Secunderabad', city: 'Hyderabad', state: 'Telangana' },
  '500001': { latitude: 17.3850, longitude: 78.4867, area: 'Abids / Koti', city: 'Hyderabad', state: 'Telangana' },
  '500004': { latitude: 17.3916, longitude: 78.4550, area: 'Nampally', city: 'Hyderabad', state: 'Telangana' },
  '500028': { latitude: 17.4005, longitude: 78.4485, area: 'Masab Tank', city: 'Hyderabad', state: 'Telangana' },
  '500084': { latitude: 17.4725, longitude: 78.3610, area: 'Kondapur', city: 'Hyderabad', state: 'Telangana' },
  '500090': { latitude: 17.5169, longitude: 78.3845, area: 'Nizampet', city: 'Hyderabad', state: 'Telangana' },
  '500049': { latitude: 17.4890, longitude: 78.3390, area: 'Miyapur', city: 'Hyderabad', state: 'Telangana' },

  // Ranga Reddy & Vikarabad (501xxx)
  '501218': { latitude: 17.2403, longitude: 78.4294, area: 'Shamshabad / Airport', city: 'Ranga Reddy', state: 'Telangana' },
  '501501': { latitude: 17.3370, longitude: 77.9040, area: 'Vikarabad Town', city: 'Vikarabad', state: 'Telangana' },
  '501141': { latitude: 17.2580, longitude: 77.5850, area: 'Tandur', city: 'Vikarabad', state: 'Telangana' },
  '501506': { latitude: 17.1890, longitude: 78.6010, area: 'Ibrahimpatnam', city: 'Ranga Reddy', state: 'Telangana' },

  // Nizamabad (503xxx)
  '503001': { latitude: 18.6725, longitude: 78.0941, area: 'Nizamabad Town', city: 'Nizamabad', state: 'Telangana' },
  '503224': { latitude: 18.7900, longitude: 78.2800, area: 'Armoor', city: 'Nizamabad', state: 'Telangana' },
  '503185': { latitude: 18.6650, longitude: 77.9010, area: 'Bodhan', city: 'Nizamabad', state: 'Telangana' },

  // Adilabad & Mancherial (504xxx)
  '504001': { latitude: 19.6641, longitude: 78.5320, area: 'Adilabad Town', city: 'Adilabad', state: 'Telangana' },
  '504208': { latitude: 18.8680, longitude: 79.4630, area: 'Mancherial', city: 'Mancherial', state: 'Telangana' },

  // Karimnagar & Jagtial (505xxx)
  '505001': { latitude: 18.4386, longitude: 79.1288, area: 'Karimnagar City', city: 'Karimnagar', state: 'Telangana' },
  '505327': { latitude: 18.7940, longitude: 78.9130, area: 'Jagtial', city: 'Jagtial', state: 'Telangana' },
  '505208': { latitude: 18.7610, longitude: 79.5140, area: 'Ramagundam / Godavarikhani', city: 'Peddapalli', state: 'Telangana' },

  // Warangal & Hanamkonda (506xxx)
  '506001': { latitude: 17.9689, longitude: 79.5941, area: 'Warangal Fort Area', city: 'Warangal', state: 'Telangana' },
  '506002': { latitude: 18.0073, longitude: 79.5539, area: 'Hanamkonda', city: 'Hanamkonda', state: 'Telangana' },
  '506003': { latitude: 17.9730, longitude: 79.5160, area: 'Kazipet', city: 'Hanamkonda', state: 'Telangana' },

  // Khammam (507xxx)
  '507001': { latitude: 17.2473, longitude: 80.1514, area: 'Khammam City', city: 'Khammam', state: 'Telangana' },
  '507101': { latitude: 17.5510, longitude: 80.6180, area: 'Kothagudem', city: 'Bhadradri Kothagudem', state: 'Telangana' },

  // Nalgonda & Suryapet (508xxx)
  '508001': { latitude: 17.0575, longitude: 79.2684, area: 'Nalgonda Town', city: 'Nalgonda', state: 'Telangana' },
  '508213': { latitude: 17.1439, longitude: 79.6239, area: 'Suryapet', city: 'Suryapet', state: 'Telangana' },
  '508207': { latitude: 16.8720, longitude: 79.5630, area: 'Miryalaguda', city: 'Nalgonda', state: 'Telangana' },

  // Mahabubnagar & Gadwal (509xxx)
  '509001': { latitude: 16.7488, longitude: 77.9856, area: 'Mahabubnagar Town', city: 'Mahabubnagar', state: 'Telangana' },
  '509301': { latitude: 16.7720, longitude: 78.1400, area: 'Jadcherla', city: 'Mahabubnagar', state: 'Telangana' },
  '509125': { latitude: 16.2310, longitude: 77.8010, area: 'Gadwal', city: 'Jogulamba Gadwal', state: 'Telangana' },

  // Bengaluru (560xxx)
  '560001': { latitude: 12.9716, longitude: 77.5946, area: 'MG Road', city: 'Bengaluru', state: 'Karnataka' },
  '560038': { latitude: 12.9784, longitude: 77.6408, area: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' },
  '560034': { latitude: 12.9352, longitude: 77.6245, area: 'Koramangala', city: 'Bengaluru', state: 'Karnataka' },
  '560102': { latitude: 12.9121, longitude: 77.6446, area: 'HSR Layout', city: 'Bengaluru', state: 'Karnataka' },
  '560103': { latitude: 12.9260, longitude: 77.6762, area: 'Bellandur', city: 'Bengaluru', state: 'Karnataka' },
  '560066': { latitude: 12.9698, longitude: 77.7500, area: 'Whitefield', city: 'Bengaluru', state: 'Karnataka' },
  '560076': { latitude: 12.8997, longitude: 77.6083, area: 'BTM Layout', city: 'Bengaluru', state: 'Karnataka' },

  // Mumbai (400xxx)
  '400001': { latitude: 18.9322, longitude: 72.8347, area: 'Fort', city: 'Mumbai', state: 'Maharashtra' },
  '400050': { latitude: 19.0596, longitude: 72.8295, area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra' },
  '400053': { latitude: 19.1363, longitude: 72.8277, area: 'Andheri West', city: 'Mumbai', state: 'Maharashtra' },

  // Delhi (110xxx)
  '110001': { latitude: 28.6328, longitude: 77.2197, area: 'Connaught Place', city: 'New Delhi', state: 'Delhi' },
  '110016': { latitude: 28.5494, longitude: 77.2001, area: 'Hauz Khas', city: 'New Delhi', state: 'Delhi' },

  // Chennai (600xxx)
  '600001': { latitude: 13.0827, longitude: 80.2707, area: 'George Town', city: 'Chennai', state: 'Tamil Nadu' },
  '600040': { latitude: 13.0850, longitude: 80.2101, area: 'Anna Nagar', city: 'Chennai', state: 'Tamil Nadu' },

  // Andhra Pradesh Major Hubs
  '520001': { latitude: 16.5062, longitude: 80.6480, area: 'Vijayawada City', city: 'Vijayawada', state: 'Andhra Pradesh' },
  '530001': { latitude: 17.6868, longitude: 83.2185, area: 'Visakhapatnam City', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  '517501': { latitude: 13.6288, longitude: 79.4192, area: 'Tirupati Town', city: 'Tirupati', state: 'Andhra Pradesh' },
  '522002': { latitude: 16.3067, longitude: 80.4365, area: 'Guntur City', city: 'Guntur', state: 'Andhra Pradesh' },
  '515001': { latitude: 14.6819, longitude: 77.6006, area: 'Anantapur', city: 'Anantapur', state: 'Andhra Pradesh' },
  '518001': { latitude: 15.8281, longitude: 78.0373, area: 'Kurnool', city: 'Kurnool', state: 'Andhra Pradesh' },
};

// District Sorting 3-Digit Prefix Mappings (Prevents defaulting distant districts to Hyderabad)
const DISTRICT_3DIGIT_PREFIXES: Record<string, PincodeCoordinates> = {
  // Telangana Districts
  '500': { latitude: 17.3850, longitude: 78.4867, city: 'Hyderabad', state: 'Telangana' },
  '501': { latitude: 17.3370, longitude: 77.9040, city: 'Vikarabad / Ranga Reddy', state: 'Telangana' },
  '502': { latitude: 18.0490, longitude: 78.2673, city: 'Medak / Sangareddy / Siddipet', state: 'Telangana' }, // Correct Medak region!
  '503': { latitude: 18.6725, longitude: 78.0941, city: 'Nizamabad', state: 'Telangana' },
  '504': { latitude: 19.6641, longitude: 78.5320, city: 'Adilabad', state: 'Telangana' },
  '505': { latitude: 18.4386, longitude: 79.1288, city: 'Karimnagar', state: 'Telangana' },
  '506': { latitude: 17.9689, longitude: 79.5941, city: 'Warangal', state: 'Telangana' },
  '507': { latitude: 17.2473, longitude: 80.1514, city: 'Khammam', state: 'Telangana' },
  '508': { latitude: 17.0575, longitude: 79.2684, city: 'Nalgonda', state: 'Telangana' },
  '509': { latitude: 16.7488, longitude: 77.9856, city: 'Mahabubnagar', state: 'Telangana' },

  // Andhra Pradesh Districts
  '515': { latitude: 14.6819, longitude: 77.6006, city: 'Anantapur', state: 'Andhra Pradesh' },
  '516': { latitude: 14.4673, longitude: 78.8242, city: 'Kadapa', state: 'Andhra Pradesh' },
  '517': { latitude: 13.6288, longitude: 79.4192, city: 'Chittoor / Tirupati', state: 'Andhra Pradesh' },
  '518': { latitude: 15.8281, longitude: 78.0373, city: 'Kurnool', state: 'Andhra Pradesh' },
  '520': { latitude: 16.5062, longitude: 80.6480, city: 'Vijayawada / Krishna', state: 'Andhra Pradesh' },
  '521': { latitude: 16.1800, longitude: 81.1300, city: 'Machilipatnam', state: 'Andhra Pradesh' },
  '522': { latitude: 16.3067, longitude: 80.4365, city: 'Guntur', state: 'Andhra Pradesh' },
  '523': { latitude: 15.5057, longitude: 80.0499, city: 'Ongole / Prakasam', state: 'Andhra Pradesh' },
  '524': { latitude: 14.4426, longitude: 79.9865, city: 'Nellore', state: 'Andhra Pradesh' },
  '530': { latitude: 17.6868, longitude: 83.2185, city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  '531': { latitude: 17.6900, longitude: 82.9800, city: 'Anakapalle', state: 'Andhra Pradesh' },
  '532': { latitude: 18.2949, longitude: 83.8938, city: 'Srikakulam', state: 'Andhra Pradesh' },
  '533': { latitude: 16.9891, longitude: 82.2475, city: 'Kakinada / East Godavari', state: 'Andhra Pradesh' },
  '534': { latitude: 16.7107, longitude: 81.0952, city: 'Eluru / West Godavari', state: 'Andhra Pradesh' },
  '535': { latitude: 18.1067, longitude: 83.3956, city: 'Vizianagaram', state: 'Andhra Pradesh' },

  // Karnataka Hubs
  '560': { latitude: 12.9716, longitude: 77.5946, city: 'Bengaluru Urban', state: 'Karnataka' },
  '561': { latitude: 13.3400, longitude: 77.1000, city: 'Tumkur', state: 'Karnataka' },
  '562': { latitude: 13.0800, longitude: 77.5000, city: 'Bengaluru Rural', state: 'Karnataka' },
  '570': { latitude: 12.2958, longitude: 76.6394, city: 'Mysuru', state: 'Karnataka' },
  '574': { latitude: 12.9141, longitude: 74.8560, city: 'Mangaluru', state: 'Karnataka' },
  '575': { latitude: 12.8700, longitude: 74.8800, city: 'Dakshina Kannada', state: 'Karnataka' },
  '580': { latitude: 15.3647, longitude: 75.1240, city: 'Hubli / Dharwad', state: 'Karnataka' },
  '585': { latitude: 17.3297, longitude: 76.8343, city: 'Kalaburagi / Gulbarga', state: 'Karnataka' },

  // Maharashtra Hubs
  '400': { latitude: 19.0760, longitude: 72.8777, city: 'Mumbai', state: 'Maharashtra' },
  '401': { latitude: 19.3919, longitude: 72.8397, city: 'Thane / Palghar', state: 'Maharashtra' },
  '411': { latitude: 18.5204, longitude: 73.8567, city: 'Pune', state: 'Maharashtra' },
  '412': { latitude: 18.6200, longitude: 73.7800, city: 'Pimpri-Chinchwad', state: 'Maharashtra' },
  '414': { latitude: 19.0948, longitude: 74.7480, city: 'Ahmednagar', state: 'Maharashtra' },
  '416': { latitude: 16.7050, longitude: 74.2433, city: 'Kolhapur', state: 'Maharashtra' },
  '431': { latitude: 19.8762, longitude: 75.3433, city: 'Chhatrapati Sambhajinagar', state: 'Maharashtra' },
  '440': { latitude: 21.1458, longitude: 79.0882, city: 'Nagpur', state: 'Maharashtra' },

  // Tamil Nadu Hubs
  '600': { latitude: 13.0827, longitude: 80.2707, city: 'Chennai', state: 'Tamil Nadu' },
  '625': { latitude: 9.9252, longitude: 78.1198, city: 'Madurai', state: 'Tamil Nadu' },
  '641': { latitude: 11.0168, longitude: 76.9558, city: 'Coimbatore', state: 'Tamil Nadu' },

  // Delhi NCR
  '110': { latitude: 28.6139, longitude: 77.2090, city: 'New Delhi', state: 'Delhi' },
  '122': { latitude: 28.4595, longitude: 77.0266, city: 'Gurugram', state: 'Haryana' },
  '201': { latitude: 28.5355, longitude: 77.3910, city: 'Noida / Ghaziabad', state: 'Uttar Pradesh' },
};

// Dynamic in-memory cache for resolved unknown pincodes
const DYNAMIC_PIN_CACHE = new Map<string, PincodeCoordinates>();

/**
 * Resolves a 6-digit Indian PIN code to accurate geographical coordinates.
 * 
 * 1. Checks exact PIN in high-precision dictionary (e.g. 502110 -> Medak, 18.0490, 78.2673)
 * 2. Checks in-memory dynamic cache
 * 3. Checks 3-digit postal district sorting prefix (e.g. 502 -> Medak/Sangareddy District)
 * 4. Checks city string match
 * 5. Falls back to Ameerpet, Hyderabad default only if completely unrecognized
 */
export function getCoordinatesFromPinCode(
  pinCode?: string | number | null,
  city?: string | null
): PincodeCoordinates {
  const pin = pinCode ? String(pinCode).trim().replace(/\D/g, '') : '';

  // 1. Exact 6-digit PIN match
  if (pin && KNOWN_PINCODES[pin]) {
    return KNOWN_PINCODES[pin];
  }

  // 2. In-memory dynamic cache
  if (pin && DYNAMIC_PIN_CACHE.has(pin)) {
    return DYNAMIC_PIN_CACHE.get(pin)!;
  }

  // 3. Accurate 3-digit sorting district prefix match
  if (pin.length >= 3) {
    const prefix3 = pin.substring(0, 3);
    if (DISTRICT_3DIGIT_PREFIXES[prefix3]) {
      return {
        ...DISTRICT_3DIGIT_PREFIXES[prefix3],
        area: `PIN ${pin} (${DISTRICT_3DIGIT_PREFIXES[prefix3].city})`,
      };
    }
  }

  // 4. Fallback check on city name
  if (city) {
    const c = city.toLowerCase();
    if (c.includes('medak') || c.includes('sangareddy') || c.includes('siddipet') || c.includes('jogipet')) {
      return KNOWN_PINCODES['502110']; // Medak District Coordinates
    }
    if (c.includes('hyd') || c.includes('secunderabad')) {
      return KNOWN_PINCODES['500016']; // Default Ameerpet Hyderabad
    }
    if (c.includes('warangal') || c.includes('hanamkonda')) {
      return KNOWN_PINCODES['506001'];
    }
    if (c.includes('karimnagar')) {
      return KNOWN_PINCODES['505001'];
    }
    if (c.includes('nizamabad')) {
      return KNOWN_PINCODES['503001'];
    }
    if (c.includes('khammam')) {
      return KNOWN_PINCODES['507001'];
    }
    if (c.includes('bengaluru') || c.includes('bangalore')) {
      return KNOWN_PINCODES['560001'];
    }
    if (c.includes('mumbai') || c.includes('bombay')) {
      return KNOWN_PINCODES['400001'];
    }
    if (c.includes('delhi')) {
      return KNOWN_PINCODES['110001'];
    }
    if (c.includes('chennai') || c.includes('madras')) {
      return KNOWN_PINCODES['600001'];
    }
  }

  // 5. Default fallback: Ameerpet Hyderabad
  return KNOWN_PINCODES['500016'];
}

/**
 * Asynchronously query Postal Pincode API or OpenStreetMap Nominatim for unknown pincodes (cached)
 */
export async function fetchPincodeCoordinatesOnline(pinCode: string): Promise<PincodeCoordinates | null> {
  const pin = pinCode.trim().replace(/\D/g, '');
  if (!pin || pin.length !== 6) return null;

  if (KNOWN_PINCODES[pin]) return KNOWN_PINCODES[pin];
  if (DYNAMIC_PIN_CACHE.has(pin)) return DYNAMIC_PIN_CACHE.get(pin)!;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pin}&country=India&format=json&limit=1`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GKFitnessApp/1.0',
        },
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0 && data[0].lat && data[0].lon) {
        const coords: PincodeCoordinates = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          area: data[0].display_name?.split(',')[0] || `PIN ${pin}`,
        };
        DYNAMIC_PIN_CACHE.set(pin, coords);
        return coords;
      }
    }
  } catch (err) {
    // Online lookup failed, fallback to 3-digit prefix
  }

  const fallback = getCoordinatesFromPinCode(pin);
  DYNAMIC_PIN_CACHE.set(pin, fallback);
  return fallback;
}
