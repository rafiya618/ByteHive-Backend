// pages/OnboardingTags.js
import TagSelector from "../../../components/Profile/TagSelector";
import { useAuth } from "../../../context/auth";
import { useNavigate } from "react-router-dom";

export default function TagSelectionpage() {
  const navigate = useNavigate();
  const {auth} = useAuth()

  const handleSave = () => {
    navigate("/"); // redirect after onboarding
  };

  return (
    <div>
      <h1>Choose Tags</h1>
      <TagSelector userId={auth?.user?._id} onSave={handleSave} />
    </div>
  );
}
