export const formatDateToYYYYMMDD = (date: string | Date): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0"); // Months are 0-based
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

 export const getCurrencySymbol = (code: string) => {
  if (!code) return ""; 
  try {
    return (0).toLocaleString("en", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).replace(/\d/g, "").trim();
  } catch (e) {
    console.warn(`Invalid currency code: ${code}`);
    return code; 
  }
};
