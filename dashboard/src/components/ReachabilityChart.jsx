import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReachabilityChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/reachability-summary')
      .then(res => res.json())
      .then(json => {
        // Transform data for stacked chart: 'Runtime', 'BuildTime', and 'NotReachable'
        const transformed = json.map(item => ({
          name: item.name,
          Runtime: item.reachable_runtime || 0,
          BuildTime: item.reachable_build_time || 0,
          NotReachable: item.total - (item.reachable || 0),
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
            <Bar dataKey="Runtime" stackId="a" fill="#8B3A3A" name="Reachable (Runtime)" />
            <Bar dataKey="BuildTime" stackId="a" fill="#D48C44" name="Reachable (Build-Time)" />
            <Bar dataKey="NotReachable" stackId="a" fill="#4A7C59" name="Not Reachable" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReachabilityChart;
