import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReachabilityChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/reachability-summary')
      .then(res => res.json())
      .then(json => {
        // Transform data for stacked chart: 'reachable' and 'notReachable'
        const transformed = json.map(item => ({
          name: item.name,
          Reachable: item.reachable,
          NotReachable: item.total - item.reachable,
        }));
        setData(transformed);
      });
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="bg-cyber-card border border-cyber-border p-6 h-80 flex flex-col">
      <h3 className="text-lg font-bold text-cyber-accent mb-4 tracking-wide uppercase">Reachability Filter Breakdown</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2c" vertical={false} />
            <XAxis dataKey="name" stroke="#e5e7eb" tick={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
            <YAxis stroke="#e5e7eb" tick={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#141416', borderColor: '#E85D2F', fontFamily: 'JetBrains Mono' }}
              itemStyle={{ fontFamily: 'JetBrains Mono' }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Space Grotesk', paddingTop: '10px' }} />
            <Bar dataKey="Reachable" stackId="a" fill="#8B3A3A" />
            <Bar dataKey="NotReachable" stackId="a" fill="#4A7C59" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReachabilityChart;
