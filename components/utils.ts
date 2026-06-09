export function getCoachingTenure(joiningDateStr?: string): string {
  if (!joiningDateStr) return '';
  const parts = joiningDateStr.split('-');
  const joinYear = parseInt(parts[0]);
  const joinMonth = parseInt(parts[1]);
  if (isNaN(joinYear) || isNaN(joinMonth)) return '';

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const totalMonths = (currentYear - joinYear) * 12 + (currentMonth - joinMonth);
  if (totalMonths < 0) {
    return '待入职';
  }
  if (totalMonths === 0) {
    return '1个月';
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years > 0) {
    return months > 0 ? `${years}年${months}个月` : `${years}年`;
  }
  return `${months}个月`;
}
