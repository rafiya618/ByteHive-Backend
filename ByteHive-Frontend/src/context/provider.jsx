// context/Providers.jsx
import { AuthProvider } from "./auth"
import { NotificationProvider } from "./NotificationContext";
import { ProfileProvider } from "./profileContext";
// import { CommunityProvider } from "./community"
// import { PostProvider } from "./post"

const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </ProfileProvider>
      {/* <CommunityProvider> */}
        {/* <PostProvider> */}
        {/* </PostProvider> */}
      {/* </CommunityProvider> */}
    </AuthProvider>
  );
};

export default AppProviders;
