import { useState, useEffect } from 'react';
import { Droplet, Thermometer, Clock, TrendingUp, Calendar } from 'lucide-react';

export default function KombuchaCalculator() {
  const [temperature, setTemperature] = useState(22);
  const [starterPercent, setStarterPercent] = useState(10);
  const [sugarPerLiter, setSugarPerLiter] = useState(70);
  const [startDateTime, setStartDateTime] = useState('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [targetTime, setTargetTime] = useState(0);
  const [progress, setProgress] = useState(0);

  // Calculate time elapsed based on start date/time
  useEffect(() => {
    if (!startDateTime) {
      setTimeElapsed(0);
      return;
    }

    const calculateElapsed = () => {
      const start = new Date(startDateTime);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      setTimeElapsed(Math.max(0, diffDays));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [startDateTime]);

  useEffect(() => {
    // Scientific model for kombucha fermentation
    // Base fermentation time at optimal conditions (24°C, 10% starter, 70g/L sugar)
    const baseTime = 7; // days
    
    // Temperature factor (fermentation slows below 20°C and above 28°C)
    const optimalTemp = 24;
    let tempFactor;
    if (temperature < 20) {
      tempFactor = 1 + (20 - temperature) * 0.15; // Slows down significantly in cold
    } else if (temperature > 28) {
      tempFactor = 1 + (temperature - 28) * 0.1; // Slows down in excessive heat
    } else {
      // Optimal range: faster fermentation between 20-28°C
      tempFactor = 1 - (Math.abs(temperature - optimalTemp) * 0.05);
    }
    
    // Starter percentage factor (more starter = faster fermentation)
    const starterFactor = Math.pow(10 / starterPercent, 0.4);
    
    // Sugar concentration factor (more sugar = longer fermentation)
    const sugarFactor = Math.pow(sugarPerLiter / 70, 0.3);
    
    // Calculate target time
    const calculatedTarget = baseTime * tempFactor * starterFactor * sugarFactor;
    setTargetTime(calculatedTarget);
    
    // Calculate progress percentage
    const calculatedProgress = startDateTime ? Math.min((timeElapsed / calculatedTarget) * 100, 100) : 0;
    setProgress(calculatedProgress);
  }, [temperature, starterPercent, sugarPerLiter, timeElapsed, startDateTime]);

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
            {/* Start Date/Time Input */}
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-indigo-700" />
                <label className="font-semibold text-gray-700">Start Date & Time</label>
              </div>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-4 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
              {startDateTime && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="font-semibold">Time Elapsed: </span>
                  <span className="text-indigo-700 font-bold">{formatTimeElapsed()}</span>
                  <span className="text-gray-500"> ({timeElapsed.toFixed(2)} days)</span>
                </div>
              )}
            </div>

            {/* Temperature Input */}
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-amber-700" />
                <label className="font-semibold text-gray-700">Temperature (°C)</label>
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
            </div>

            {/* Starter Percentage Input */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-700" />
                <label className="font-semibold text-gray-700">Starter Amount (%)</label>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                value={starterPercent}
                onChange={(e) => setStarterPercent(Number(e.target.value))}
                className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>5%</span>
                <span className="font-bold text-blue-700">{starterPercent}%</span>
                <span>30%</span>
              </div>
            </div>

            {/* Sugar Input */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Droplet className="w-5 h-5 text-purple-700" />
                <label className="font-semibold text-gray-700">Sugar per Liter (g/L)</label>
              </div>
              <input
                type="range"
                min="40"
                max="120"
                value={sugarPerLiter}
                onChange={(e) => setSugarPerLiter(Number(e.target.value))}
                className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>40 g/L</span>
                <span className="font-bold text-purple-700">{sugarPerLiter} g/L</span>
                <span>120 g/L</span>
              </div>
            </div>

            {/* Results */}
            {startDateTime && (
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 p-6 rounded-xl mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Fermentation Analysis</h2>
                
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Target Fermentation Time</p>
                    <p className="text-2xl font-bold text-amber-700">{targetTime.toFixed(1)} days</p>
                  </div>

                  <div className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="text-sm font-semibold text-gray-700">{getProgressLabel()}</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${getProgressColor()}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
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