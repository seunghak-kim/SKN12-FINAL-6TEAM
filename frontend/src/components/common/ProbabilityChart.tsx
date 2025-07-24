import React from 'react';

interface ProbabilityData {
  [key: string]: number;
}

interface ProbabilityChartProps {
  probabilities: ProbabilityData;
  title?: string;
}

const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ 
  probabilities, 
  title = "유형별 확률 분석" 
}) => {
  const sortedProbabilities = Object.entries(probabilities)
    .sort(([, a], [, b]) => b - a);

  const getPersonalityColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      '추진형': 'bg-red-500',
      '내면형': 'bg-blue-500', 
      '관계형': 'bg-green-500',
      '쾌락형': 'bg-yellow-500',
      '안정형': 'bg-purple-500'
    };
    return colorMap[type] || 'bg-gray-500';
  };

  const getPersonalityBgColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      '추진형': 'bg-red-100',
      '내면형': 'bg-blue-100',
      '관계형': 'bg-green-100', 
      '쾌락형': 'bg-yellow-100',
      '안정형': 'bg-purple-100'
    };
    return colorMap[type] || 'bg-gray-100';
  };

  const getPersonalityTextColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      '추진형': 'text-red-800',
      '내면형': 'text-blue-800',
      '관계형': 'text-green-800',
      '쾌락형': 'text-yellow-800', 
      '안정형': 'text-purple-800'
    };
    return colorMap[type] || 'text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 mb-4">
      <div className="text-center mb-4">
        <div className="flex justify-center items-center mb-4">
          <div className="bg-green-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
            02
          </div>
        </div>
        <h4 className="text-lg font-semibold text-gray-800 mb-4">{title}</h4>
        
        <div className="space-y-3">
          {sortedProbabilities.map(([type, probability], index) => (
            <div key={type} className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-16 text-right">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getPersonalityBgColor(type)} ${getPersonalityTextColor(type)}`}>
                  {type}
                </span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${getPersonalityColor(type)}`}
                      style={{ 
                        width: `${probability}%`,
                        animationDelay: `${index * 200}ms`
                      }}
                    />
                  </div>
                  <div className="flex-shrink-0 w-12 text-right">
                    <span className="text-sm font-semibold text-gray-700">
                      {probability.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-xs text-gray-500">
          <p>각 성격 유형에 대한 매칭 확률을 보여줍니다</p>
        </div>
      </div>
    </div>
  );
};

export default ProbabilityChart;