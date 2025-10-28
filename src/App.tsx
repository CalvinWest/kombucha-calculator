import { useState, useEffect } from 'react';
import type { ReactNode, ChangeEvent } from 'react';
import { Droplet, Thermometer, Clock, TrendingUp, Calendar } from 'lucide-react';

// --- START OF MODIFIED CODE 1: Improved date formatting ---
const formatProjectedDate = (finishDate: Date): ReactNode => {
  const now = new Date();
  
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const startOfFinishDate = new Date(finishDate);
  startOfFinishDate.setHours(0, 0, 0, 0);

  const daysUntil = (startOfFinishDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24);

  // If the finish date is far in the future, show the full date for clarity
  if (daysUntil > 12) {
    return finishDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  // Handle "Today" & "Tomorrow"
  if (daysUntil === 0) return <>Later today</>;
  if (daysUntil === 1) return <>Tomorrow</>;
  
  // Handle "This" vs "Next" for dates within the next ~12 days
  const finishDayOfWeek = finishDate.getDay(); // Sunday = 0
  const todayDayOfWeek = now.getDay();
  const prefix = (finishDayOfWeek >= todayDayOfWeek && daysUntil < 7) ? "This" : "Next";
  const weekday = finishDate.toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <>
      <span className="text-gray-500">{prefix}</span> {weekday}
    </>
  );
};
// --- END OF MODIFIED CODE 1 ---

export default function KombuchaCalculator() {
  const [temperature, setTemperature] = useState(() => {
    const saved = localStorage.getItem('kombuchaTemp');
    return saved ? Number(saved) : 22;
  });
  const [starterPercent, setStarterPercent] = useState(() => {
    const saved = localStorage.getItem('kombuchaStarter');
    return saved ? Number(saved) : 10;
  });
  const [sugarPerLiter, setSugarPerLiter] = useState(() => {
    const saved = localStorage.getItem('kombuchaSugar');
    return saved ? Number(saved) : 70;
  });
  const [startDateTime, setStartDateTime] = useState(() => {
    return localStorage.getItem('kombuchaStartDate') || '';
  });

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [projectedFinishDisplay, setProjectedFinishDisplay] = useState<ReactNode | null>(null);

  useEffect(() => {
    localStorage.setItem('kombuchaTemp', String(temperature));
    localStorage.setItem('kombuchaStarter', String(starterPercent));
    localStorage.setItem('kombuchaSugar', String(sugarPerLiter));
    localStorage.setItem('kombuchaStartDate', startDateTime);
  }, [temperature, starterPercent, sugarPerLiter, startDateTime]);

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

  useEffect(() => {
    const baseTime = 7; // days
    const tempFactor = Math.pow(24 / temperature, 1.8);
    const starterFactor = Math.pow(10 / starterPercent, 0.4);
    const sugarFactor = Math.pow(sugarPerLiter / 70, 0.3);
    const targetTimeInDays = baseTime * tempFactor * starterFactor * sugarFactor;
    const calculatedProgress = startDateTime ? Math.min((timeElapsed / targetTimeInDays) * 100, 100) : 0;
    setProgress(calculatedProgress);

    if (startDateTime) {
      const start = new Date(startDateTime);
      if (!isNaN(start.getTime())) {
        const finishDate = new Date(start.getTime() + targetTimeInDays * 24 * 60 * 60 * 1000);
        setProjectedFinishDisplay(formatProjectedDate(finishDate));
      }
    } else {
      setProjectedFinishDisplay(null);
    }
  }, [temperature, starterPercent, sugarPerLiter, timeElapsed, startDateTime]);
  
  // --- START OF MODIFIED CODE 2: Logic for separate Date and Hour inputs ---
  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    if (!newDate) {
      setStartDateTime('');
      return;
    }
    const currentHour = startDateTime ? new Date(startDateTime).getHours() : new Date().getHours();
    const newDateTime = new Date(newDate);
    newDateTime.setHours(currentHour);
    setStartDateTime(newDateTime.toISOString());
  };

  const handleHourChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newHour = Number(e.target.value);
    if (!startDateTime) return; // Don't set hour if date isn't set
    const newDateTime = new Date(startDateTime);
    newDateTime.setHours(newHour);
    setStartDateTime(newDateTime.toISOString());
  };

  const startDateValue = startDateTime ? startDateTime.split('T')[0] : '';
  const startHourValue = startDateTime ? new Date(startDateTime).getHours() : -1; // -1 for placeholder
  // --- END OF MODIFIED CODE 2 ---


  const getProgressColor = () => {
    if (progress < 50) return 'bg-blue-500';
    if (progress < 80) return 'bg-yellow-500';
    if (progress < 100) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getProgressLabel = () => {
    if (progress < 50) return 'Early Stage';
    if (progress < 80) return 'Active Fermentation';
    if (progress < 100) return 'Nearly Ready';
    return 'Ready to Taste!';
  };

  const formatTimeElapsed = () => {
    const days = Math.floor(timeElapsed);
    const hours = Math.floor((timeElapsed - days) * 24);
    const minutes = Math.floor(((timeElapsed - days) * 24 - hours) * 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Droplet className="w-8 h-8 text-amber-600" />
            <h1 className="text-3xl font-bold text-gray-800">Kombucha Fermentation Calculator</h1>
          </div>
          <div className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-700" />
                <label className="font-semibold text-gray-700">Start Date & Time</label>
              </div>
              
              {/* --- START OF MODIFIED CODE 3: New Date and Hour Inputs --- */}
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
                  <option value="-1" disabled>Hour</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              {/* --- END OF MODIFIED CODE 3 --- */}

              {startDateTime && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Time Elapsed: </span>
                  <span className="text-indigo-700 font-bold">{formatTimeElapsed()}</span>
                  <span className="text-gray-500"> ({timeElapsed.toFixed(2)} days)</span>
                </div>
              )}
            </div>
            
            {/* ... (rest of the inputs for Temperature, Starter, Sugar are unchanged) ... */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-amber-700" />
                <label className="font-semibold text-gray-700">Temperature (°C)</label>
              </div>
              <input type="range" min="15" max="35" value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>15°C</span><span className="font-bold text-amber-700">{temperature}°C</span><span>35°C</span>
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-700" />
                <label className="font-semibold text-gray-700">Starter Amount (%)</label>
              </div>
              <input type="range" min="5" max="30" value={starterPercent} onChange={(e) => setStarterPercent(Number(e.target.value))} className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>5%</span><span className="font-bold text-blue-700">{starterPercent}%</span><span>30%</span>
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-5 h-5 text-purple-700" />
                <label className="font-semibold text-gray-700">Sugar per Liter (g/L)</label>
              </div>
              <input type="range" min="40" max="120" value={sugarPerLiter} onChange={(e) => setSugarPerLiter(Number(e.target.value))} className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>40 g/L</span><span className="font-bold text-purple-700">{sugarPerLiter} g/L</span><span>120 g/L</span>
              </div>
            </div>

            {/* Results */}
            {startDateTime && (
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Fermentation Analysis</h2>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Projected Finish Date</p>
                    <p className="text-2xl font-bold text-amber-700">{projectedFinishDisplay}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="text-sm font-semibold text-gray-700">{getProgressLabel()}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                      <div className={`h-4 rounded-full transition-all duration-500 ${getProgressColor()}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{progress.toFixed(1)}%</p>
                  </div>
                  {progress >= 70 && progress < 100 && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="text-sm text-yellow-800">Your kombucha is nearly ready! Consider tasting to check if it has reached your desired flavor balance.</p>
                    </div>
                  )}
                  {progress >= 100 && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                      <p className="text-sm text-green-800">Your kombucha should be ready! Taste test and bottle when you're happy with the flavor.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!startDateTime && (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 rounded-xl text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">Enter your fermentation start date and time to see progress</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}