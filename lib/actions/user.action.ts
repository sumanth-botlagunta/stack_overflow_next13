'use server';

import User from '@/database/user.model';
import { connectToDataBase } from '../mongoose';
import {
  CreateUserParams,
  DeleteUserParams,
  GetAllUsersParams,
  UpdateUserParams,
} from './shared.types';
import { revalidatePath } from 'next/cache';
import Question from '@/database/question.model';

export async function getUserById(params: any) {
  try {
    connectToDataBase();
    const { userId } = params;
    const user = await User.findOne({ clerkId: userId });
    return user._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function createUser(userData: CreateUserParams) {
  try {
    connectToDataBase();

    const user = await User.create(userData);
    return user._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function updateUser(params: UpdateUserParams) {
  try {
    connectToDataBase();
    const { clerkId, path, updateData } = params;
    await User.findOneAndUpdate({ clerkId }, updateData, { new: true });
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteUser(params: DeleteUserParams){
  try {
    connectToDataBase();
    const {clerkId} = params;
    const user = await User.findOneAndDelete({clerkId});

    // const userQuestionIds = await Question.find({ author: user._id}).distinct('_id');
    await Question.deleteMany({ author: user._id});
    
    // TODO: delete all answers and comments ... from user

    const deletedUser = await User.findByIdAndDelete(user._id);
    return deletedUser._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
};


export async function getAllUsers(params: GetAllUsersParams) {
  try {
    connectToDataBase();

    // const { page = 1, pageSize = 20, filter, searchQuery } = params;

    const users = await User.find({}).sort({ createdAt: -1 });

    return { users };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
