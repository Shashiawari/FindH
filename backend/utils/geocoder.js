const axios = require('axios');

const geocodeAddress = async (addressLines) => {

    // ================= FIX HERE =================
    // Accept both Array or String safely

    const fullAddress = Array.isArray(addressLines)
        ? addressLines.filter(Boolean).join(', ')
        : addressLines;

    if (!fullAddress) return { lat: 0, lng: 0 };

    // ================= GOOGLE MAPS =================

    if (process.env.GOOGLE_API_KEY) {
        try {

            const response = await axios.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                {
                    params: {
                        address: fullAddress,
                        key: process.env.GOOGLE_API_KEY
                    }
                }
            );

            if (
                response.data.status === 'OK' &&
                response.data.results.length > 0
            ) {

                const { lat, lng } =
                    response.data.results[0].geometry.location;

                return { lat, lng };

            }

        } catch (error) {
            console.error('Google Geocoding error:', error.message);
        }
    }

    // ================= NOMINATIM FALLBACK =================

    try {

        const response = await axios.get(
            "https://nominatim.openstreetmap.org/search",
            {
                params: {
                    q: fullAddress,
                    format: "json",
                    limit: 1
                },
                headers: {
                    "User-Agent": "FindH-App/1.0"
                }
            }
        );

        if (response.data && response.data.length > 0) {

            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };

        }

    } catch (error) {
        console.error('Nominatim Geocoding error:', error.message);
    }

    // ================= DEFAULT =================

    return { lat: 0, lng: 0 };
};

module.exports = { geocodeAddress };