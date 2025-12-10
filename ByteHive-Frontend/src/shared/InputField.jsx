// src/components/InputField.jsx
const InputField = ({
  type,
  value,
  onChange,
  placeholder,
  name,
  id,
  accept,
  required,
  rows = 3, // default for textarea
}) => {
  // Textarea
  if (type === "textarea") {
    return (
      <textarea
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 sm:py-2.5 rounded-md 
                   bg-dark-indigo border border-faint-greyish-overlay  
                   text-white placeholder-gray-300  
                   hover:outline-1 hover:outline-white
                   focus:outline-1 focus:outline-white 
                   transition-all"
        {...(required !== undefined ? { required } : {})}
      />
    );
  }

  // File Input
  if (type === "file") {
    return (
      <input
        type="file"
        onChange={onChange}
        name={name}
        id={id}
        accept={accept}
        className="block w-full text-sm text-gray-300 
                   file:mr-4 file:py-2 file:px-4 file:rounded-md 
                   file:border-0 file:bg-blue-600 file:text-white 
                   hover:file:bg-blue-700"
        {...(required !== undefined ? { required } : {})}
      />
    );
  }

  // Default Input
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      name={name}
      id={id}
      placeholder={placeholder}
      className="w-full px-3 py-2 sm:py-2.5 rounded-md 
                 bg-dark-indigo border border-faint-greyish-overlay  
                 text-white placeholder-gray-300  
                 hover:outline-1 hover:outline-white
                 focus:outline-1 focus:outline-white 
                 transition-all"
      {...(required !== undefined ? { required } : {})}
    />
  );
};

export default InputField;
