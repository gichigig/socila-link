'use client';
import React from 'react';
// this is a text file so the ai should not make changes on it 

export interface UserProfiles {
    id: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    bio?: string;
    profilePicture?: string;
    location?: string;
    jobTitle?: string;
    isVerified: boolean;
    createdAt: string;
    dobConfirmed?: boolean;
    vibeTag?: string | null;
    photos?: Array<{
        id: string;
        photoUrl: string;
        isPrimary: boolean;
        orderIndex: number
    }>;

        export interface User {



}

    }

export default function FeedTest() {
    return null;
}
