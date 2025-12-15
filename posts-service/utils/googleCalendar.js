// utils/googleCalendar.js
import { google } from "googleapis";

/**
 * Build OAuth2 client using ONLY refresh token (passed from frontend).
 * This avoids storing tokens server-side if you don't want to.
 */
const getOAuth2Client = (refreshToken) => {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "urn:ietf:wg:oauth:2.0:oob"
  );

  // Use refresh_token to obtain an access_token automatically by googleapis
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
};

const buildGoogleEvent = (event) => {
  // Ensure we have a valid date
  const startDate = new Date(event.event_date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

  return {
    summary: event.event_name || 'Bytehive Event',
    description: `${event.small_event_description || ''}\n\n${event.registration_link ? `Registration: ${event.registration_link}` : ''}`,
    location: event.location || 'Online',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'UTC',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'UTC',
    },
    // Add some useful metadata
    source: {
      title: 'Bytehive Event Platform',
      url: event.registration_link || 'https://bytehive.com'
    }
  };
};

export const createGoogleCalendarEvent = async (refreshToken, event) => {
  try {
    console.log('Creating Google Calendar event for:', event.event_name);
    
    const auth = getOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });
    
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: buildGoogleEvent(event),
    });
    
    console.log('Google Calendar event created:', response.data.id);
    return response.data.id;
  } catch (err) {
    console.error("Google Calendar create error:", err?.message || err);
    if (err.code === 401) {
      console.error("Authentication failed - refresh token may be expired");
    }
    return null;
  }
};

export const updateGoogleCalendarEvent = async (refreshToken, googleEventId, event) => {
  try {
    const auth = getOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.update({
      calendarId: "primary",
      eventId: googleEventId,
      requestBody: buildGoogleEvent(event),
    });
    return true;
  } catch (err) {
    console.error("Google update error:", err?.message || err);
    return false;
  }
};

export const deleteGoogleCalendarEvent = async (refreshToken, googleEventId) => {
  try {
    const auth = getOAuth2Client(refreshToken);
    const calendar = google.calendar({ version: "v3", auth });
    await calendar.events.delete({
      calendarId: "primary",
      eventId: googleEventId,
    });
    return true;
  } catch (err) {
    console.error("Google delete error:", err?.message || err);
    return false;
  }
};
