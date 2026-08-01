import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const ReachabilityChart = ({ refreshTrigger }) => {
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
  }, [refreshTrigger]);

  if (data.length === 0) return null;

  return (
    <div className="glass-card p-6 h-80 flex flex-col">
      <h3 className="text-lg font-heading font-bold text-cyber-cyan mb-4 tracking-wide uppercase">Reachability Filter Breakdown</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} />
            <YAxis stroke="#9ca3af" tick={{ fontFamily: 'JetBrains Mono', fontSize: 12 }} allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#00F0FF', fontFamily: 'JetBrains Mono' }}
              itemStyle={{ fontFamily: 'JetBrains Mono' }}
            />
            <Legend wrapperStyle={{ fontFamily: 'Inter', paddingTop: '10px' }} />
            <Bar dataKey="Runtime" stackId="a" fill="#EF4444" name="Reachable (Runtime)" />
            <Bar dataKey="BuildTime" stackId="a" fill="#F59E0B" name="Reachable (Build-Time)" />
            <Bar dataKey="NotReachable" stackId="a" fill="#10B981" name="Not Reachable" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ReachabilityChart;
