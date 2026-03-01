/**
 * HRManagement — Admin HR & Payroll page.
 * Three sub-tabs: Employees, Leave Requests, Payroll.
 */

import { useState } from 'react';
import { addEmployee, actionLeaveRequest, savePayroll } from '../../services/api';
import { showToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import AttendanceView from '../../components/AttendanceView';
import EmployeeAttendanceMatrix from '../../components/EmployeeAttendanceMatrix';

export default function HRManagement({ adminData, onReload }) {
    const { user } = useAuth();
    const [subTab, setSubTab] = useState('emp'); // 'emp' | 'leave' | 'pay'
    const employees = adminData?.employees || [];
    const leaves = adminData?.leaves || [];
    const payroll = adminData?.payroll || [];

    // --- Add Employee ---
    const [showEmpModal, setShowEmpModal] = useState(false);
    const [savingEmp, setSavingEmp] = useState(false);
    const [empForm, setEmpForm] = useState({
        name: '', mobile: '', role: 'Faculty', username: '', password: '', salary: '',
    });

    const handleAddEmployee = async () => {
        setSavingEmp(true);
        const result = await addEmployee({ ...empForm, branch: user?.branch });
        if (result?.error) alert(result.error);
        else if (result?.success) {
            showToast('Employee Added');
            setShowEmpModal(false);
            setEmpForm({ name: '', mobile: '', role: 'Faculty', username: '', password: '', salary: '' });
            onReload?.();
        }
        setSavingEmp(false);
    };

    // --- Leave Actions ---
    const handleLeaveAction = async (id, status) => {
        if (!confirm(`Mark this request as ${status}?`)) return;
        await actionLeaveRequest(id, status);
        showToast('Updated');
        onReload?.();
    };

    // --- Payroll ---
    const [payForm, setPayForm] = useState({ empId: '', days: 26, amount: '', date: '' });
    const [baseSalary, setBaseSalary] = useState(0);
    const [savingPay, setSavingPay] = useState(false);

    const handleEmpSelect = (empId) => {
        const emp = employees.find((e) => e.id === empId);
        if (emp) {
            setBaseSalary(Number(emp.salary));
            setPayForm((p) => ({ ...p, empId, amount: emp.salary, days: 26 }));
        }
    };

    const calcPay = (days) => {
        const perDay = baseSalary / 30;
        setPayForm((p) => ({ ...p, days, amount: Math.round(perDay * days) }));
    };

    const handlePayroll = async () => {
        setSavingPay(true);
        const emp = employees.find((e) => e.id === payForm.empId);
        const result = await savePayroll({
            empId: payForm.empId,
            name: emp?.name || 'Unknown',
            days: payForm.days,
            amount: payForm.amount,
            date: payForm.date,
        });
        if (result?.success) { showToast('Payroll Saved'); onReload?.(); }
        setSavingPay(false);
    };

    const subTabs = [
        { id: 'emp', label: 'Employees' },
        { id: 'att', label: 'Attendance' },
        { id: 'leave', label: 'Leave Requests' },
        { id: 'pay', label: 'Payroll' },
    ];

    // --- Employee Attendance ---
    const [selectedAttEmp, setSelectedAttEmp] = useState('');
    const empAttendance = adminData?.empAttendance || [];

    // Filter logs for selected employee
    const selectedEmpLogs = empAttendance.filter(r => String(r.empId) === String(selectedAttEmp));

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">HR Management</h1>

            {/* Sub-tabs */}
            <div className="flex gap-4 mb-6 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
                {subTabs.map((t) => (
                    <button
                        key={t.id}
                        className={`px-4 py-2 ${subTab === t.id ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
                        onClick={() => setSubTab(t.id)}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* === Employees Tab === */}
            {subTab === 'emp' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <button className="btn bg-green-600" onClick={() => setShowEmpModal(true)}>
                            <i className="fas fa-plus" /> Add Employee
                        </button>
                    </div>
                    <div className="card p-0 overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="t-head">
                                <tr><th>ID</th><th>Name</th><th>Role</th><th>Mobile</th><th>Salary</th></tr>
                            </thead>
                            <tbody>
                                {employees.length > 0 ? employees.map((e, i) => (
                                    <tr key={i} className="t-row">
                                        <td>{e.id}</td>
                                        <td className="font-bold">{e.name}</td>
                                        <td>{e.role}</td>
                                        <td>{e.mobile}</td>
                                        <td>₹{e.salary}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400">No Employees</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Modal isOpen={showEmpModal} onClose={() => setShowEmpModal(false)} title="Add New Employee">
                        <input className="inp" placeholder="Full Name" value={empForm.name} onChange={(e) => setEmpForm((p) => ({ ...p, name: e.target.value }))} />
                        <input className="inp" placeholder="Mobile Number" value={empForm.mobile} onChange={(e) => setEmpForm((p) => ({ ...p, mobile: e.target.value }))} />
                        <select className="inp" value={empForm.role} onChange={(e) => setEmpForm((p) => ({ ...p, role: e.target.value }))}>
                            <option>Faculty</option><option>Admin</option><option>Counselor</option>
                        </select>
                        <input className="inp" placeholder="Username for Login" value={empForm.username} onChange={(e) => setEmpForm((p) => ({ ...p, username: e.target.value }))} />
                        <input className="inp" placeholder="Password" value={empForm.password} onChange={(e) => setEmpForm((p) => ({ ...p, password: e.target.value }))} />
                        <input className="inp" type="number" placeholder="Monthly Salary" value={empForm.salary} onChange={(e) => setEmpForm((p) => ({ ...p, salary: e.target.value }))} />
                        <div className="flex justify-end gap-2 mt-2">
                            <button className="text-gray-500 font-bold px-4" onClick={() => setShowEmpModal(false)}>Cancel</button>
                            <button className="btn" onClick={handleAddEmployee} disabled={savingEmp}>{savingEmp ? 'Creating...' : 'Create Employee'}</button>
                        </div>
                    </Modal>
                </div>
            )}

            {/* === Employee Attendance Tab === */}
            {subTab === 'att' && (
                <div className="animate-fade-in">
                    <EmployeeAttendanceMatrix employees={employees} logs={empAttendance} />
                </div>
            )}

            {/* === Leave Requests Tab === */}
            {subTab === 'leave' && (
                <div className="card p-0 overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                        <thead className="t-head">
                            <tr><th>Emp Name</th><th>Type</th><th>Dates</th><th>Reason</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {leaves.length > 0 ? leaves.map((l, i) => (
                                <tr key={i} className="t-row">
                                    <td>{l.name}</td>
                                    <td>{l.type}</td>
                                    <td>{l.from} - {l.to}</td>
                                    <td>{l.reason}</td>
                                    <td>
                                        <button onClick={() => handleLeaveAction(l.id, 'Approved')} className="text-green-600 font-bold mr-2 border border-green-200 bg-green-50 px-3 py-1 rounded">Approve</button>
                                        <button onClick={() => handleLeaveAction(l.id, 'Rejected')} className="text-red-600 font-bold border border-red-200 bg-red-50 px-3 py-1 rounded">Reject</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="p-4 text-center text-gray-400">No Pending Requests</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* === Payroll Tab === */}
            {subTab === 'pay' && (
                <div>
                    <div className="card max-w-xl mb-4">
                        <h3 className="font-bold mb-2">Generate Payroll</h3>
                        <select className="inp" value={payForm.empId} onChange={(e) => handleEmpSelect(e.target.value)}>
                            <option value="">Select Employee</option>
                            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                            <input className="inp" type="number" placeholder="Days Present" value={payForm.days} onChange={(e) => calcPay(Number(e.target.value))} />
                            <input className="inp" type="number" placeholder="Calculated Salary" value={payForm.amount} readOnly />
                        </div>
                        <input className="inp" type="date" value={payForm.date} onChange={(e) => setPayForm((p) => ({ ...p, date: e.target.value }))} />
                        <button className="btn w-full" onClick={handlePayroll} disabled={savingPay}>{savingPay ? 'Saving...' : 'Save Salary Record'}</button>
                    </div>

                    <div className="card p-0 overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="t-head">
                                <tr><th>Date</th><th>Employee</th><th>Amount</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {payroll.map((p, i) => (
                                    <tr key={i} className="t-row">
                                        <td>{new Date(p[1]).toLocaleDateString()}</td>
                                        <td className="font-bold">{p[3]}</td>
                                        <td className="text-green-600 font-bold">₹{p[5]}</td>
                                        <td><Badge text="Paid" variant="green" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
