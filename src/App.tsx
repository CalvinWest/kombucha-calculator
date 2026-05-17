import { useState, useEffect } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import { Droplet, Thermometer, Clock, TrendingUp, Calendar, FlaskConical } from 'lucide-react';

// ============================================================
// STAGE SYSTEM
// ============================================================

type Stage = {
  key: string;
  label: string;
  min: number;
  max: number;
  description: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
};

const STAGES: Stage[] = [
  {
    key: 'sweet_tea',
    label: 'Sweet Tea',
    min: 0,
    max: 0.25,
    description: 'Barely fermented. Still tastes mostly like sweetened tea.',
    textColor: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
  },
  {
    key: 'awakening',
    label: 'Awakening',
    min: 0.25,
    max: 0.6,
    description: 'Fermentation is active. A slight tang is emerging, but still quite sweet.',
    textColor: 'text-amber-800',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
  },
  {
    key: 'balanced',
    label: 'Balanced',
    min: 0.6,
    max: 1.1,
    description: 'The classic kombucha profile. Sweet-tart equilibrium.',
    textColor: 'text-orange-800',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-500',
  },
  {
    key: 'tart',
    label: 'Tart',
    min: 1.1,
    max: 1.6,
    description: 'Acidity is dominant, sugar receding. Dry and assertive.',
    textColor: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-500',
  },
  {
    key: 'vinegary',
    label: 'Vinegary',
    min: 1.6,
    max: 2.5,
    description: 'Sharp and acetic. Drinkable but assertive.',
    textColor: 'text-rose-900',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-600',
  },
  {
    key: 'spent',
    label: 'Spent',
    min: 2.5,
    max: Infinity,
    description: 'Over-acidified and flat-tasting. The SCOBY may be stressed.',
    textColor: 'text-stone-800',
    bgColor: 'bg-stone-100',
    borderColor: 'border-stone-600',
  },
];

const getStage = (score: number): Stage => {
  return STAGES.find(s => score >= s.min && score < s.max) ?? STAGES[STAGES.length - 1];
};

const VISUAL_MAX_SCORE = STAGES[STAGES.length - 1].min;

// ============================================================
// DATE FORMATTING (improved version from the other branch)
// ============================================================

const formatProjectedDate = (finishDate: Date): ReactNode => {
  const now = new Date();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startOfFinishDate = new Date(finishDate);
  startOfFinishDate.setHours(0, 0, 0, 0);

  const daysUntil =
    (startOfFinishDate.getTime() - startOfToday.getTime()) /
    (1000 * 60 * 60 * 24);

  // Past dates or far future — show the full date
  if (finishDate.getTime() < now.getTime() || daysUntil > 12) {
    return finishDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  // Today & Tomorrow
  if (daysUntil === 0) return <>Later today</>;
  if (daysUntil === 1) return <>Tomorrow</>;

  // "This" vs "Next" for dates within ~12 days
  const finishDayOfWeek = finishDate.getDay();
  const todayDayOfWeek = now.getDay();
  const prefix =
    finishDayOfWeek >= todayDayOfWeek && daysUntil < 7 ? 'This' : 'Next';
  const weekday = finishDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <>
      <span className="text-gray-500">{prefix}</span> {weekday}
    </>
  );
};

// ============================================================
// TEMPERATURE FETCH
// ============================================================

async function fetchAverageTemp(
  city: string,
  startISO: string
): Promise<{ temp: number; resolvedCity: string }> {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  const geoData = await geoRes.json();
  if (!geoData.results?.length) throw new Error(`City "${city}" not found`);
  const { latitude, longitude, name, country } = geoData.results[0];

  const start = new Date(startISO);
  const now = new Date();
  const startDateStr = start.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const tempMap = new Map<string, number>();

  // Archive API covers up to ~5 days ago
  const archiveEnd = new Date(now);
  archiveEnd.setDate(archiveEnd.getDate() - 5);
  if (start < archiveEnd) {
    const archiveEndStr = archiveEnd.toISOString().split('T')[0];
    const archiveRes = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDateStr}&end_date=${archiveEndStr}&daily=temperature_2m_mean&timezone=auto`
    );
    const archiveData = await archiveRes.json();
    (archiveData.daily?.time ?? []).forEach((date: string, i: number) => {
      const val = archiveData.daily.temperature_2m_mean[i];
      if (val != null) tempMap.set(date, val);
    });
  }

  // Forecast API fills the recent gap
  const daysSinceStart = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / 86400000));
  const forecastRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_mean&timezone=auto&past_days=${Math.min(daysSinceStart, 92)}&forecast_days=1`
  );
  const forecastData = await forecastRes.json();
  (forecastData.daily?.time ?? []).forEach((date: string, i: number) => {
    if (date >= startDateStr && date <= todayStr) {
      const val = forecastData.daily.temperature_2m_mean[i];
      if (val != null && !tempMap.has(date)) tempMap.set(date, val);
    }
  });

  if (tempMap.size === 0) throw new Error('No temperature data available');
  const values = Array.from(tempMap.values());
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { temp: Math.round(avg), resolvedCity: `${name}, ${country}` };
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function KombuchaCalculator() {
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('kombuchaTemp');
    return saved ? Number(saved) : 22;
  });
  const [sweetTeaVolume, setSweetTeaVolume] = useState(() => {
    const saved = localStorage.getItem('kombuchaSweetTeaVolume');
    return saved ? Number(saved) : 3000; // mL
  });
  const [starterVolume, setStarterVolume] = useState(() => {
    const saved = localStorage.getItem('kombuchaStarterVolume');
    return saved ? Number(saved) : 300; // mL
  });
  const [sugarGrams, setSugarGrams] = useState(() => {
    const saved = localStorage.getItem('kombuchaSugarGrams');
    return saved ? Number(saved) : 210; // g
  });
  const [startDateTime, setStartDateTime] = useState(() => {
    return localStorage.getItem('kombuchaStartDate') || '';
  });

  const [city, setCity] = useState(() => localStorage.getItem('kombuchaCity') || '');
  const [tempStatus, setTempStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [tempStatusMsg, setTempStatusMsg] = useState('');

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [fermentationScore, setFermentationScore] = useState(0);
  const [peakBalancedDate, setPeakBalancedDate] = useState<Date | null>(null);

  // Persist inputs
  useEffect(() => {
    localStorage.setItem('kombuchaTemp', String(temperature));
    localStorage.setItem('kombuchaSweetTeaVolume', String(sweetTeaVolume));
    localStorage.setItem('kombuchaStarterVolume', String(starterVolume));
    localStorage.setItem('kombuchaSugarGrams', String(sugarGrams));
    localStorage.setItem('kombuchaStartDate', startDateTime);
    localStorage.setItem('kombuchaCity', city);
  }, [temperature, sweetTeaVolume, starterVolume, sugarGrams, startDateTime, city]);

  // Track elapsed time
  useEffect(() => {
    if (!startDateTime) {
      setTimeElapsed(0);
      return;
    }
    const calculateElapsed = () => {
      const start = new Date(startDateTime);
      if (isNaN(start.getTime())) {
        setTimeElapsed(0);
        return;
      }
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      setTimeElapsed(Math.max(0, diffDays));
    };
    calculateElapsed();
    const interval = setInterval(calculateElapsed, 60000);
    return () => clearInterval(interval);
  }, [startDateTime]);

  // Compute fermentation score and stage projections
  useEffect(() => {
    // Convert absolute inputs into the ratios the model needs.
    const totalLiquid = sweetTeaVolume + starterVolume;
    const starterPercent =
      totalLiquid > 0 ? (starterVolume / totalLiquid) * 100 : 10;
    const sugarPerLiter =
      sweetTeaVolume > 0 ? sugarGrams / (sweetTeaVolume / 1000) : 70;

    // Reference time = days to reach middle of Balanced stage (~score 0.85)
    // under reference conditions (24°C, 10% starter, 70 g/L).
    const referenceTime = 8;

    const tempFactor = Math.pow(24 / temperature, 1.8);
    const starterFactor = Math.pow(10 / Math.max(starterPercent, 0.1), 0.4);
    const sugarFactor = Math.pow(Math.max(sugarPerLiter, 0.1) / 70, 0.3);

    const adjustedReferenceTime =
      referenceTime * tempFactor * starterFactor * sugarFactor;

    const score = startDateTime ? timeElapsed / adjustedReferenceTime : 0;
    setFermentationScore(score);

    if (startDateTime) {
      const start = new Date(startDateTime);
      if (!isNaN(start.getTime())) {
        setPeakBalancedDate(new Date(
          start.getTime() + 0.85 * adjustedReferenceTime * 24 * 60 * 60 * 1000
        ));
      }
    } else {
      setPeakBalancedDate(null);
    }
  }, [
    temperature,
    sweetTeaVolume,
    starterVolume,
    sugarGrams,
    timeElapsed,
    startDateTime,
  ]);

  const currentStage = getStage(fermentationScore);

  // ---- Date + Hour split inputs (from the other branch) ----
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) {
      setStartDateTime('');
      return;
    }
    const currentHour = startDateTime
      ? new Date(startDateTime).getHours()
      : new Date().getHours();
    const newDateTime = new Date(newDate);
    newDateTime.setHours(currentHour);
    setStartDateTime(newDateTime.toISOString());
  };

  const handleFetchTemp = async () => {
    if (!city || !startDateTime) return;
    setTempStatus('loading');
    try {
      const { temp, resolvedCity } = await fetchAverageTemp(city, startDateTime);
      setTemperature(Math.min(35, Math.max(15, temp)));
      setTempStatus('success');
      setTempStatusMsg(`Avg for ${resolvedCity} since brew start: ${temp}°C`);
    } catch (e) {
      setTempStatus('error');
      setTempStatusMsg(e instanceof Error ? e.message : 'Failed to fetch temperature');
    }
  };

  const handleHourChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newHour = Number(e.target.value);
    if (!startDateTime) return;
    const newDateTime = new Date(startDateTime);
    newDateTime.setHours(newHour);
    setStartDateTime(newDateTime.toISOString());
  };

  const startDateValue = startDateTime ? startDateTime.split('T')[0] : '';
  const startHourValue = startDateTime
    ? new Date(startDateTime).getHours()
    : -1;

  const formatTimeElapsed = () => {
    const days = Math.floor(timeElapsed);
    const hours = Math.floor((timeElapsed - days) * 24);
    const minutes = Math.floor(((timeElapsed - days) * 24 - hours) * 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const markerPosition = Math.min(
    (fermentationScore / VISUAL_MAX_SCORE) * 100,
    100
  );

  // Derived display values
  const totalLiquidLiters = ((sweetTeaVolume + starterVolume) / 1000).toFixed(2);
  const starterPercentDisplay =
    sweetTeaVolume + starterVolume > 0
      ? ((starterVolume / (sweetTeaVolume + starterVolume)) * 100).toFixed(1)
      : '0';
  const sugarDensityDisplay =
    sweetTeaVolume > 0
      ? (sugarGrams / (sweetTeaVolume / 1000)).toFixed(0)
      : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Droplet className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-800">
              Kombucha Fermentation Tracker
            </h1>
          </div>

          <div className="space-y-6">
            {/* Start Date & Hour */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-700" />
                <label className="font-semibold text-gray-700">
                  Start Date & Time
                </label>
              </div>
              <div className="flex gap-4">
                <input
                  type="date"
                  value={startDateValue}
                  onChange={handleDateChange}
                  className="w-2/3 px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={startHourValue}
                  onChange={handleHourChange}
                  disabled={!startDateTime}
                  className="w-1/3 px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="-1" disabled>
                    Hour
                  </option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              {startDateTime && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Time Elapsed: </span>
                  <span className="text-indigo-700 font-bold">
                    {formatTimeElapsed()}
                  </span>
                  <span className="text-gray-500">
                    {' '}
                    ({timeElapsed.toFixed(2)} days)
                  </span>
                </div>
              )}
            </div>

            {/* Temperature */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-amber-700" />
                <label className="font-semibold text-gray-700">
                  Temperature (°C)
                </label>
              </div>
              <input
                type="range"
                min="15"
                max="35"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>15°C</span>
                <span className="font-bold text-amber-700">{temperature}°C</span>
                <span>35°C</span>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="City (e.g. Vancouver)"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setTempStatus('idle'); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchTemp()}
                  className="flex-1 px-3 py-1.5 text-sm border-2 border-amber-200 rounded-lg focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleFetchTemp}
                  disabled={!city || !startDateTime || tempStatus === 'loading'}
                  className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {tempStatus === 'loading' ? '…' : 'Auto-fill'}
                </button>
              </div>
              {(tempStatus === 'success' || tempStatus === 'error') && (
                <p className={`text-xs mt-1.5 ${tempStatus === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                  {tempStatusMsg}
                </p>
              )}
            </div>

            {/* Sweet Tea Volume */}
            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FlaskConical className="w-5 h-5 text-teal-700" />
                <label className="font-semibold text-gray-700">
                  Sweet Tea Volume (mL)
                </label>
              </div>
              <input
                type="number"
                min="0"
                step="50"
                value={sweetTeaVolume}
                onChange={(e) => setSweetTeaVolume(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-teal-200 rounded-lg focus:outline-none focus:border-teal-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                The freshly brewed sweetened tea, before adding starter.
              </p>
            </div>

            {/* Starter Volume */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-700" />
                <label className="font-semibold text-gray-700">
                  Starter Tea Volume (mL)
                </label>
              </div>
              <input
                type="number"
                min="0"
                step="25"
                value={starterVolume}
                onChange={(e) => setStarterVolume(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Mature kombucha from a previous batch ({starterPercentDisplay}% of total liquid).
              </p>
            </div>

            {/* Sugar */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-5 h-5 text-purple-700" />
                <label className="font-semibold text-gray-700">Sugar (g)</label>
              </div>
              <input
                type="number"
                min="0"
                step="10"
                value={sugarGrams}
                onChange={(e) => setSugarGrams(Number(e.target.value))}
                className="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:border-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total sugar dissolved in the sweet tea ({sugarDensityDisplay} g/L).
              </p>
            </div>

            {/* Batch summary */}
            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 flex justify-between">
              <span>
                Total batch: <strong>{totalLiquidLiters} L</strong>
              </span>
              <span>
                Starter: <strong>{starterPercentDisplay}%</strong>
              </span>
              <span>
                Sugar density: <strong>{sugarDensityDisplay} g/L</strong>
              </span>
            </div>

            {/* Results */}
            {startDateTime && (
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl mt-8">
                <div className="space-y-4">
                  {/* Current stage headline + gradient bar */}
                  <div
                    className={`bg-white p-4 rounded-lg border-l-4 ${currentStage.borderColor}`}
                  >
                    <p className={`text-3xl font-bold ${currentStage.textColor}`}>
                      {currentStage.label}
                    </p>
                    <p className="text-sm text-gray-700 mt-2">
                      {currentStage.description}
                    </p>

                    <div className="relative mt-4">
                      <div
                        className="w-full h-6 rounded-full"
                        style={{
                          background:
                            'linear-gradient(to right, #fef08a 0%, #fbbf24 17%, #fb923c 37%, #ef4444 53%, #be123c 70%, #44403c 100%)',
                        }}
                      ></div>
                      <div
                        className="absolute top-0 h-6 w-1 bg-white border-2 border-gray-800 rounded-sm transition-all duration-500"
                        style={{
                          left: `calc(${markerPosition}% - 2px)`,
                        }}
                      ></div>
                    </div>
                    <div className="relative mt-2 text-[10px] text-gray-500 h-4">
                      {STAGES.map((s, i) => {
                        const isFirst = i === 0;
                        const isLast = i === STAGES.length - 1;
                        const peakScore = isFirst ? 0 : isLast ? s.min : (s.min + s.max) / 2;
                        const left = (peakScore / VISUAL_MAX_SCORE) * 100;
                        return (
                          <span
                            key={s.key}
                            className={`absolute ${s.key === currentStage.key ? `font-bold ${s.textColor}` : ''}`}
                            style={{
                              left: `${left}%`,
                              transform: isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                            }}
                          >
                            {s.label}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-gray-500">
                      <span>Score: {fermentationScore.toFixed(2)}</span>
                      {peakBalancedDate && (
                        <span className="font-semibold text-orange-800">
                          Peak Balanced: {formatProjectedDate(peakBalancedDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!startDateTime && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 rounded-xl text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  Enter your fermentation start date and time to see progress
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}