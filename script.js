const API = {
    CURRENT: 'https://api.openweathermap.org/data/2.5/weather',
    FORECAST: 'https://api.openweathermap.org/data/2.5/forecast',
    GEOCODING: 'https://api.openweathermap.org/geo/1.0/direct'
};

const API_KEY = '1c066f0f77302135e8f6edefd58a2606'; // Replace with your API key
const { DateTime } = luxon;

const elements = {
    cityInput: document.getElementById('cityInput'),
    searchBtn: document.getElementById('searchBtn'),
    locationBtn: document.getElementById('locationBtn'),
    currentWeather: document.getElementById('currentWeather'),
    hourlyForecast: document.getElementById('hourlyForecast'),
    weeklyForecast: document.getElementById('weeklyForecast'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error')
};

const helpers = {
    getWindDirection: (degrees) => {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        return directions[Math.round(degrees / 22.5) % 16];
    },
    formatVisibility: (meters) => {
        return meters >= 1000 ? `${(meters/1000).toFixed(1)} km` : `${meters} m`;
    },
    formatTime: (timestamp) => {
        return DateTime.fromSeconds(timestamp).toFormat('HH:mm');
    },
    formatDate: (timestamp) => {
        return DateTime.fromSeconds(timestamp).toFormat('dd MMM yyyy');
    }
};

async function getCoordinates(city) {
    try {
        const response = await fetch(`${API.GEOCODING}?q=${city}&limit=1&appid=${API_KEY}`);
        if (!response.ok) throw new Error('City not found');
        const data = await response.json();
        if (!data.length) throw new Error(`No results for "${city}"`);
        return {
            lat: data[0].lat,
            lon: data[0].lon,
            name: data[0].name,
            country: data[0].country
        };
    } catch (error) {
        showError(error.message);
        return null;
    }
}

async function getWeatherData(lat, lon) {
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${API.CURRENT}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`),
            fetch(`${API.FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) throw new Error('Weather data unavailable');
        return {
            current: await currentRes.json(),
            forecast: await forecastRes.json()
        };
    } catch (error) {
        showError(error.message);
        return null;
    }
}

function updateCurrentWeather(data, coords) {
    const current = data.current;
    
    // Basic Info
    document.getElementById('cityName').textContent = `${coords.name}, ${coords.country}`;
    document.getElementById('currentDate').textContent = helpers.formatDate(current.dt);
    document.getElementById('currentTemp').textContent = `${Math.round(current.main.temp)}°C`;
    document.getElementById('weatherCondition').textContent = current.weather[0].description;
    
    // Weather Icon
    const iconUrl = `https://openweathermap.org/img/wn/${current.weather[0].icon}@4x.png`;
    document.getElementById('weatherIcon').src = iconUrl;

    // Detailed Metrics
    document.getElementById('feelsLike').textContent = `${Math.round(current.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${current.main.humidity}%`;
    document.getElementById('pressure').textContent = `${current.main.pressure} hPa`;
    document.getElementById('visibility').textContent = helpers.formatVisibility(current.visibility);
    document.getElementById('windSpeed').textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    document.getElementById('windDirection').textContent = helpers.getWindDirection(current.wind.deg);
    document.getElementById('cloudiness').textContent = `${current.clouds.all}%`;
    document.getElementById('sunrise').textContent = helpers.formatTime(current.sys.sunrise);
    document.getElementById('sunset').textContent = helpers.formatTime(current.sys.sunset);

    // Wind Direction Arrow
    document.getElementById('windDirectionIcon').style.transform = `rotate(${current.wind.deg}deg)`;
}

function updateHourlyForecast(forecastData) {
    const hourlyHTML = forecastData.list.slice(0, 8).map(item => `
        <div class="text-center p-3 bg-white/10 rounded-lg text-white">
            <p class="font-medium">${DateTime.fromSeconds(item.dt).toFormat('HH:mm')}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" 
                 class="w-12 mx-auto my-2">
            <p class="text-2xl font-bold">${Math.round(item.main.temp)}°C</p>
            <div class="mt-2 space-y-1">
                <p class="text-sm">Feels ${Math.round(item.main.feels_like)}°C</p>
                <p class="text-sm">💨 ${Math.round(item.wind.speed * 3.6)} km/h</p>
                <p class="text-sm">💧 ${item.main.humidity}%</p>
                <p class="text-sm">☁️ ${item.clouds.all}%</p>
            </div>
        </div>
    `).join('');
    document.getElementById('hourlyList').innerHTML = hourlyHTML;
}

function updateWeeklyForecast(forecastData) {
    const dailyData = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
    
    const weeklyHTML = dailyData.map(day => `
        <div class="flex items-center justify-between p-4 bg-white/10 rounded-lg text-white">
            <div class="flex-1">
                <p class="font-medium">${DateTime.fromSeconds(day.dt).toFormat('EEEE')}</p>
                <p class="text-sm text-gray-200">${day.weather[0].description}</p>
            </div>
            <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" 
                 class="w-12 mx-4">
            <div class="text-right p-1">
                <p class="font-bold">${Math.round(day.main.temp_max)}°C</p>
            </div>
            &nbsp;
            <div class="w-24 text-sm space-y-1">
                <p>💧 ${day.main.humidity}%</p>
                <p>💨 ${Math.round(day.wind.speed * 3.6)} km/h</p>
                <p>☁️ ${day.clouds.all}%</p>
            </div>
        </div>
    `).join('');
    document.getElementById('forecastList').innerHTML = weeklyHTML;
}

async function updateUI(city) {
    try {
        toggleLoading(true);
        const coords = await getCoordinates(city);
        if (!coords) return;

        const data = await getWeatherData(coords.lat, coords.lon);
        if (!data) return;

        updateCurrentWeather(data, coords);
        updateHourlyForecast(data.forecast);
        updateWeeklyForecast(data.forecast);

        elements.currentWeather.classList.remove('hidden');
        elements.hourlyForecast.classList.remove('hidden');
        elements.weeklyForecast.classList.remove('hidden');
        toggleLoading(false);

    } catch (error) {
        showError(error.message);
        toggleLoading(false);
    }
}

function getLocation() {
    if (!navigator.geolocation) return showError('Geolocation not supported');
    navigator.geolocation.getCurrentPosition(
        async position => {
            try {
                const { latitude, longitude } = position.coords;
                const response = await fetch(
                    `${API.GEOCODING}?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
                );
                const data = await response.json();
                if (data[0]?.name) updateUI(data[0].name);
                else showError('Location not found');
            } catch (error) {
                showError('Failed to get location');
            }
        },
        error => showError('Location access denied')
    );
}

function toggleLoading(show) {
    elements.loading.classList.toggle('hidden', !show);
    [elements.currentWeather, elements.hourlyForecast, elements.weeklyForecast]
        .forEach(el => el.classList.toggle('hidden', show));
}

function showError(message) {
    elements.error.textContent = message;
    elements.error.classList.remove('hidden');
    setTimeout(() => elements.error.classList.add('hidden'), 5000);
}

// Event Listeners
elements.searchBtn.addEventListener('click', () => {
    const city = elements.cityInput.value.trim();
    if (city) updateUI(city);
});

elements.locationBtn.addEventListener('click', getLocation);
elements.cityInput.addEventListener('keypress', e => {
    if (e.key === 'Enter' && elements.cityInput.value.trim()) {
        updateUI(elements.cityInput.value.trim());
    }
});

// Initial animation
gsap.from('.animate-fade-in', {
    duration: 0.8,
    opacity: 0,
    y: 20,
    stagger: 0.1,
    ease: 'power2.out'
});