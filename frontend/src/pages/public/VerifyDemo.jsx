import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';

const VerifyDemo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('E-Mail wird verifiziert...');
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Ungültiger Verifizierungslink');
      return;
    }

    verifyToken(token);
  }, [searchParams]);

  const verifyToken = async (token) => {
    try {
      setStatus('verifying');
      setMessage('E-Mail wird verifiziert...');

      const response = await api.get(`/demo/verify/${token}`);
      
      if (response.data.success) {
        setStatus('success');
        setMessage(response.data.message);
        setAccountInfo(response.data.account);
        
        // Redirect to login after 5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      }

    } catch (error) {
      console.error('Verification failed:', error);
      setStatus('error');
      
      if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage('Verifizierung fehlgeschlagen. Bitte kontaktieren Sie den Support.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            TrapMap Demo-Verifizierung
          </h2>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Verifizierung läuft...
              </h3>
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center">
              <div className="rounded-full h-12 w-12 bg-green-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-green-900 mb-2">
                🎉 Erfolgreich verifiziert!
              </h3>
              
              <p className="text-gray-700 mb-6">{message}</p>
              
              {accountInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium text-green-900 mb-2">
                    Ihr Demo-Account:
                  </h4>
                  <p className="text-sm text-green-700">
                    <strong>E-Mail:</strong> {accountInfo.email}
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Organisation:</strong> {accountInfo.organization}
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700">
                    📧 <strong>Ihre Login-Daten wurden per E-Mail gesendet!</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Prüfen Sie auch den Spam-Ordner
                  </p>
                </div>
                
                <button
                  onClick={() => navigate('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Zum Login
                </button>
                
                <p className="text-xs text-gray-500 text-center">
                  Sie werden automatisch in 5 Sekunden weitergeleitet...
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="rounded-full h-12 w-12 bg-red-100 mx-auto mb-4 flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              
              <h3 className="text-lg font-medium text-red-900 mb-2">
                Verifizierung fehlgeschlagen
              </h3>
              
              <p className="text-gray-700 mb-6">{message}</p>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">
                    <strong>Mögliche Ursachen:</strong>
                  </p>
                  <ul className="text-xs text-yellow-600 mt-1 list-disc list-inside">
                    <li>Link ist abgelaufen (24h Gültigkeit)</li>
                    <li>Link wurde bereits verwendet</li>
                    <li>Link ist fehlerhaft</li>
                  </ul>
                </div>
                
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Neue Demo-Anfrage stellen
                </button>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Bei Problemen kontaktieren Sie uns:
                  </p>
                  <a 
                    href="mailto:info@trap-map.de" 
                    className="text-xs text-blue-600 hover:text-blue-500"
                  >
                    info@trap-map.de
                  </a>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default VerifyDemo;