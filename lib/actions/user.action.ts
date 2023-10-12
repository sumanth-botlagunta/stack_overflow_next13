'use server';

import User from '@/database/user.model';
import { connectToDataBase } from '../mongoose';

export async function getUserById(userId: string) {
  try {
    connectToDataBase();

    const user = await User.findOne({ clerkId: userId });
    return user;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
