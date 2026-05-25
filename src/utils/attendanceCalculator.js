export function calculateAttendanceStats(log, settings = {}) {
  const regularHours = Number(settings.regular_hours) || 8.0;
  const overtimeRate = Number(settings.overtime_rate) || 1.5;
  const regularMinutes = regularHours * 60;
  
  if (!log.clock_in_time) return { totalMinutes: 0, deficitMinutes: 0, overtimeMinutes: 0, status: 'absent' };

  const clockIn = new Date(log.clock_in_time);
  const clockOut = log.clock_out_time ? new Date(log.clock_out_time) : new Date(); // If not clocked out, use current time for live estimate

  let totalMinutes = Math.floor((clockOut - clockIn) / (1000 * 60));

  if (log.leave_out_time) {
    const leaveOut = new Date(log.leave_out_time);
    const leaveIn = log.leave_in_time ? new Date(log.leave_in_time) : new Date();
    const leaveMinutes = Math.floor((leaveIn - leaveOut) / (1000 * 60));
    totalMinutes -= Math.max(0, leaveMinutes);
  }

  totalMinutes = Math.max(0, totalMinutes);

  let deficitMinutes = 0;
  let overtimeMinutes = 0;

  if (totalMinutes < regularMinutes) {
    deficitMinutes = regularMinutes - totalMinutes;
  } else if (totalMinutes > regularMinutes) {
    overtimeMinutes = Math.floor((totalMinutes - regularMinutes) * overtimeRate);
  }
  
  let statusColor = 'green'; // default full shift
  if (deficitMinutes > 15) statusColor = 'amber';
  if (overtimeMinutes > 0) statusColor = 'purple';
  
  // Checking weekends/holidays is complex without full calendar integration, but we can return raw metrics
  return {
    totalMinutes,
    deficitMinutes,
    overtimeMinutes,
    statusColor,
    isComplete: !!log.clock_out_time
  };
}
