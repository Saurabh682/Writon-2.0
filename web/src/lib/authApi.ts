import { User } from '../types';
import { mapProfileToUser } from './api';

interface RegistrationProfile {
  penName: string;
  fullName: string;
  bio?: string;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  const payload = await response.json().catch(() => null);
  return new Error(payload?.error || fallback);
}

export async function fetchMyProfile(idToken: string): Promise<User> {
  const response = await fetch('/api/v1/me', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) throw await readError(response, 'Could not load your WritOn profile.');
  const payload = await response.json();
  return mapProfileToUser(payload.profile);
}

export async function registerMyProfile(
  idToken: string,
  profile: RegistrationProfile,
): Promise<User> {
  const response = await fetch('/api/v1/me', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  });
  if (!response.ok) throw await readError(response, 'Could not create your WritOn profile.');
  const payload = await response.json();
  return mapProfileToUser(payload.profile);
}
