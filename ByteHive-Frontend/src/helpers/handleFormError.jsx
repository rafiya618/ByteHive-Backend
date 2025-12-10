// ============================
// 🔹 Error Handler Helper
// ============================
import toast from "react-hot-toast";

export const handleFormError = (err, setErrors, defaultField = "name") => {
  const { message, field } = err.response?.data || {};
  const serverMsg = message || "Something went wrong";

  console.log("serverMsg", serverMsg);

  if (field) {
    // ✅ Attach error to a specific field
    setErrors((prev) => ({
      ...prev,
      [field || defaultField]: serverMsg,
    }));
  } else {
    // ✅ No specific field -> show global toast
    toast.error(serverMsg);
  }
};
