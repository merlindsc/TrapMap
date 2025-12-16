// ============================================
// AUDIT REPORT BUTTON
// Einfacher Button zum Öffnen des Generators
// ============================================

import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import AuditReportGenerator from './AuditReportGenerator';

const AuditReportButton = ({ 
  objectId, 
  objectName,
  variant = 'primary', // primary, secondary, outline, icon
  size = 'md', // sm, md, lg
  className = ''
}) => {
  const [showGenerator, setShowGenerator] = useState(false);

  const baseClasses = "inline-flex items-center justify-center gap-2 font-medium transition-all rounded-lg";
  
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50",
    icon: "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-blue-600"
  };

  const sizeClasses = {
    sm: variant === 'icon' ? "p-2" : "px-3 py-1.5 text-sm",
    md: variant === 'icon' ? "p-2.5" : "px-4 py-2",
    lg: variant === 'icon' ? "p-3" : "px-6 py-3 text-lg"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <>
      <button
        onClick={() => setShowGenerator(true)}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        title="Audit-Report erstellen"
      >
        <FileText className={iconSizes[size]} />
        {variant !== 'icon' && <span>Audit-Report</span>}
      </button>

      {showGenerator && (
        <AuditReportGenerator
          objectId={objectId}
          objectName={objectName}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </>
  );
};

export default AuditReportButton;


// ============================================
// VERWENDUNG:
// ============================================
// 
// import AuditReportButton from './components/AuditReportButton';
//
// // In deiner Komponente:
// <AuditReportButton 
//   objectId={object.id} 
//   objectName={object.name}
// />
//
// // Varianten:
// <AuditReportButton objectId={1} variant="primary" />    // Blauer Button
// <AuditReportButton objectId={1} variant="secondary" /> // Grauer Button
// <AuditReportButton objectId={1} variant="outline" />   // Outline
// <AuditReportButton objectId={1} variant="icon" />      // Nur Icon
//
// // Größen:
// <AuditReportButton objectId={1} size="sm" />
// <AuditReportButton objectId={1} size="md" />
// <AuditReportButton objectId={1} size="lg" />