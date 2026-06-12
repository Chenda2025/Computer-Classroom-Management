'use client';
import { useState } from 'react';
import CertificatePrintModal from '../certificates/CertificatePrintModal';

export default function TestCertificateClient() {
  const [showModal, setShowModal] = useState(true);

  // Mock certificate data for testing design
  const mockCertificate: any = {
    id: 'test-123',
    title: 'វគ្គបណ្តុះបណ្តាលកុំព្យូទ័រទូទៅ',
    issuedDate: new Date().toISOString(),
    description: 'កុំព្យូទ័ររដ្ឋបាល (Word, Excel, PowerPoint)',
    studentId: 'student-123',
    student: {
      id: 'student-123',
      studentCode: 'STU-001',
      name: 'សិស្ស គំរូ',
      nameEn: 'Sample Student',
      gender: 'ប្រុស',
      dateOfBirth: '2005-01-01',
      grade: '12A',
      photoUrl: null, // Test empty photo
      enrollments: [
        {
          id: 'enr-1',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          course: { name: 'វគ្គបណ្តុះបណ្តាលកុំព្យូទ័រទូទៅ' }
        }
      ],
      results: [
        {
          id: 'res-1',
          score: 95,
          createdAt: new Date().toISOString(),
          exam: {
            course: { name: 'វគ្គបណ្តុះបណ្តាលកុំព្យូទ័រទូទៅ' },
            questions: [{ points: 100 }]
          }
        }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>ទំព័រតេស្តរចនាវិញ្ញាបនបត្រ</h1>
        {!showModal && (
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            + បើកផ្ទាំងរចនា (Open Designer)
          </button>
        )}
      </div>
      
      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        នេះគឺជាទំព័រសម្រាប់លោកគ្រូធ្វើការតេស្ត និងរៀបចំគំរូវិញ្ញាបនបត្រ ដោយមិនប៉ះពាល់ដល់ទិន្នន័យសិស្សពិតប្រាកដ។ ទិន្នន័យនៅលើវិញ្ញាបនបត្រនេះគឺជាទិន្នន័យសិប្បនិម្មិត (Mock Data)។
      </p>

      {showModal && (
        <CertificatePrintModal 
          certificate={mockCertificate} 
          onClose={() => setShowModal(false)} 
        />
      )}
    </div>
  );
}
