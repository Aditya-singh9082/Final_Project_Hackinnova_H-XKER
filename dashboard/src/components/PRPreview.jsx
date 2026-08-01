import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, GitPullRequest } from 'lucide-react';

const PRPreview = ({ packageKey }) => {
  const [prMarkdown, setPrMarkdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:3001/api/pr/${packageKey}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.text();
      })
      .then(text => {
        setPrMarkdown(text);
        setLoading(false);
      })
      .catch(err => {
        setPrMarkdown(`Error loading PR body: ${err.message}`);
        setLoading(false);
      });
  }, [packageKey]);

  if (loading) return (
    <div className="animate-pulse bg-cyber-card p-6 border border-cyber-border h-64 flex items-center justify-center rounded-sm">
      <span className="text-gray-500 font-mono text-sm uppercase">Loading PR...</span>
    </div>
  );

  return (
    <div className="bg-cyber-bg border border-cyber-border rounded-sm overflow-hidden flex flex-col max-h-[600px]">
      <div className="bg-cyber-card px-4 py-3 border-b border-cyber-border flex items-center gap-2">
        <GitPullRequest size={16} className="text-cyber-accent" />
        <span className="text-gray-200 font-bold text-xs uppercase font-sans tracking-wide">Automated Security Patch: {packageKey}</span>
      </div>
      <div className="p-6 overflow-y-auto text-gray-300 text-sm github-markdown font-sans">
        <ReactMarkdown
          components={{
            h1: ({node, ...props}) => <h1 className="text-xl font-bold border-b border-cyber-border pb-2 mb-4 text-gray-100" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-lg font-bold border-b border-cyber-border pb-2 mt-6 mb-4 text-gray-200" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-base font-bold mt-4 mb-2 text-gray-300" {...props} />,
            p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 text-gray-400" {...props} />,
            li: ({node, ...props}) => <li className="mb-1" {...props} />,
            code: ({node, inline, ...props}) => 
              inline ? 
              <code className="bg-cyber-card px-1.5 py-0.5 rounded-sm text-[12px] font-mono text-cyber-accent border border-cyber-border" {...props} /> :
              <pre className="bg-cyber-card p-4 rounded-sm overflow-x-auto mb-4 border border-cyber-border"><code className="font-mono text-[12px] text-gray-300" {...props} /></pre>,
            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-cyber-accent pl-4 text-gray-500 italic mb-4" {...props} />,
            table: ({node, ...props}) => <table className="w-full border-collapse mb-4 text-sm font-mono" {...props} />,
            th: ({node, ...props}) => <th className="border border-cyber-border p-2 bg-cyber-card font-semibold text-left text-gray-400 uppercase text-xs" {...props} />,
            td: ({node, ...props}) => <td className="border border-cyber-border p-2 text-gray-300" {...props} />,
          }}
        >
          {prMarkdown}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default PRPreview;
