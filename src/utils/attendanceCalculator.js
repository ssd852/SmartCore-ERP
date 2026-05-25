export function calculateAttendanceStats(log, settings = {}, dateStr = null) {
  const regularHours = Number(settings.regular_hours) || 8.0;
  const overtimeRate = Number(settings.overtime_rate) || 1.5;
  const regularMinutes = regularHours * 60;
  
  // Check if date is a holiday
  const holidays = Array.isArray(settings.holidays) ? settings.holidays : [];
  const isHoliday = dateStr && holidays.includes(dateStr);
  
  if (!log || !log.clock_in_time) {
    // If it's a holiday and they are absent, they are fully paid (0 deficit)
    if (isHoliday) {
      return { totalMinutes: 0, deficitMinutes: 0, overtimeMinutes: 0, status: 'holiday', statusColor: 'emerald' };
    }
    return { totalMinutes: 0, deficitMinutes: regularMinutes, overtimeMinutes: 0, status: 'absent', statusColor: 'rose' };
  }

  const clockIn = new Date(log.clock_in_time);
  const clockOut = log.clock_out_time ? new Date(log.clock_out_time) : new Date();

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

  if (isHoliday) {
    // Every minute worked on a holiday is considered double overtime
    overtimeMinutes = Math.floor(totalMinutes * (overtimeRate * 2));
    deficitMinutes = 0; // No deficit on holidays
  } else {
    if (totalMinutes < regularMinutes) {
      deficitMinutes = regularMinutes - totalMinutes;
    } else if (totalMinutes > regularMinutes) {
      overtimeMinutes = Math.floor((totalMinutes - regularMinutes) * overtimeRate);
    }
  }
  
  let statusColor = 'green';
  if (isHoliday && totalMinutes > 0) statusColor = 'indigo'; // Special color for worked holiday
  else if (deficitMinutes > 15) statusColor = 'amber';
  else if (overtimeMinutes > 0) statusColor = 'purple';
  
  return {
    totalMinutes,
    deficitMinutes,
    overtimeMinutes,
    statusColor,
    isHoliday,
    isComplete: !!log.clock_out_time
  };
}
