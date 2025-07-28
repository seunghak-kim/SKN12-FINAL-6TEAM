import React from 'react';
import { AnalysisStep } from '../../types';

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  currentStep: number;
  completedSteps: number;
  totalSteps: number;
  estimatedRemaining?: string;
}

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  steps,
  currentStep,
  completedSteps,
  totalSteps,
  estimatedRemaining
}) => {
  const containerStyle: React.CSSProperties = {
    padding: '24px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '500px',
    margin: '0 auto'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0
  };

  const counterStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    background: '#f3f4f6',
    padding: '4px 12px',
    borderRadius: '20px'
  };

  const estimatedTimeStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#059669',
    background: '#d1fae5',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '20px',
    textAlign: 'center'
  };

  const stepsContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  };

  const getStepItemStyle = (step: AnalysisStep): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    position: 'relative'
  });

  const stepIndicatorStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginRight: '16px'
  };

  const getStepCircleStyle = (step: AnalysisStep): React.CSSProperties => ({
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    transition: 'all 0.3s ease',
    background: step.completed ? '#059669' : step.current ? '#3b82f6' : '#f3f4f6',
    color: step.completed || step.current ? 'white' : '#6b7280',
    border: !step.completed && !step.current ? '2px solid #e5e7eb' : 'none'
  });

  const checkIconStyle: React.CSSProperties = {
    width: '20px',
    height: '20px'
  };


  const stepNumberStyle: React.CSSProperties = {
    fontSize: '16px'
  };

  const getStepConnectorStyle = (step: AnalysisStep): React.CSSProperties => ({
    width: '2px',
    height: '32px',
    background: step.completed ? '#059669' : '#e5e7eb',
    marginTop: '8px',
    transition: 'background-color 0.3s ease'
  });

  const stepContentStyle: React.CSSProperties = {
    flex: 1,
    paddingTop: '8px'
  };

  const getStepNameStyle = (step: AnalysisStep): React.CSSProperties => ({
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
    color: step.completed ? '#059669' : step.current ? '#3b82f6' : '#6b7280'
  });

  const getStepDescriptionStyle = (step: AnalysisStep): React.CSSProperties => ({
    fontSize: '14px',
    color: step.current ? '#1f2937' : '#6b7280',
    lineHeight: 1.4
  });

  return (
    <>
      <div style={containerStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>분석 진행 상황</h3>
          <span style={counterStyle}>
            {completedSteps}/{totalSteps} 단계 완료
          </span>
        </div>
        
        {estimatedRemaining && (
          <div style={estimatedTimeStyle}>
            예상 소요 시간: {estimatedRemaining}
          </div>
        )}

        <div style={stepsContainerStyle}>
          {steps.map((step, index) => (
            <div key={index} style={getStepItemStyle(step)}>
              <div style={stepIndicatorStyle}>
                <div style={getStepCircleStyle(step)}>
                  {step.completed ? (
                    <svg
                      style={checkIconStyle}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : step.current ? (
                    <span style={stepNumberStyle}>{index + 1}</span>
                  ) : (
                    <span style={stepNumberStyle}>{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div style={getStepConnectorStyle(step)} />
                )}
              </div>
              
              <div style={stepContentStyle}>
                <div style={getStepNameStyle(step)}>{step.name}</div>
                <div style={getStepDescriptionStyle(step)}>{step.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default AnalysisProgress;