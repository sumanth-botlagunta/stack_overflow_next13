'use server';

import User from '@/database/user.model';
import { connectToDataBase } from '../mongoose';
import {
  CreateUserParams,
  DeleteUserParams,
  GetAllUsersParams,
  GetSavedQuestionsParams,
  GetUserByIdParams,
  GetUserStatsParams,
  ToggleSaveQuestionParams,
  UpdateUserParams,
} from './shared.types';
import { revalidatePath } from 'next/cache';
import Question from '@/database/question.model';
import Tag from '@/database/tag.model';
import Answer from '@/database/answer.model';
import { FilterQuery } from 'mongoose';
import escapeStringRegexp from 'escape-string-regexp';

export async function getUserById(params: { userId: string }) {
  try {
    connectToDataBase();
    const { userId } = params;
    const user = await User.findOne({ clerkId: userId });
    return user;
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

export async function deleteUser(params: DeleteUserParams) {
  try {
    connectToDataBase();
    const { clerkId } = params;
    const user = await User.findOneAndDelete({ clerkId });

    // const userQuestionIds = await Question.find({ author: user._id}).distinct('_id');
    await Question.deleteMany({ author: user._id });

    // TODO: delete all answers and comments ... from user

    const deletedUser = await User.findByIdAndDelete(user._id);
    return deletedUser._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getAllUsers(params: GetAllUsersParams) {
  try {
    connectToDataBase();
    const { searchQuery, filter, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;
    // const { page = 1, pageSize = 20, filter, searchQuery } = params;
    const query: FilterQuery<typeof User> = {};
    if (searchQuery) {
      query.$or = [
        { name: { $regex: new RegExp(searchQuery, 'i') } },
        { username: { $regex: new RegExp(searchQuery, 'i') } },
        { email: { $regex: new RegExp(searchQuery, 'i') } },
        { bio: { $regex: new RegExp(searchQuery, 'i') } },
      ];
    }
    let sortOptions = {};
    switch (filter) {
      case 'new_users':
        sortOptions = { joinedAt: -1 };
        break;
      case 'old_users':
        sortOptions = { joinedAt: 1 };
        break;
      case 'top_contributors':
        sortOptions = { reputation: -1 };
        break;

      default:
        break;
    }

    const users = await User.find(query)
      .sort(sortOptions)
      .skip(skipAmount)
      .limit(pageSize);
    const totalUsers = await User.countDocuments(query);
    const isNext = totalUsers > skipAmount + pageSize;

    return { users, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function toggleSaveQuestion(params: ToggleSaveQuestionParams) {
  try {
    connectToDataBase();
    const { path, questionId, userId } = params;
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    const isQuestionSaved = user.saved.includes(questionId);
    let updateQuery = {};
    if (isQuestionSaved) {
      updateQuery = { $pull: { saved: questionId } };
    } else {
      updateQuery = { $addToSet: { saved: questionId } };
    }
    const newuser = await User.findByIdAndUpdate(userId, updateQuery, {
      new: true,
    });
    revalidatePath(path);
    return newuser;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getSavedQuestions(params: GetSavedQuestionsParams) {
  try {
    connectToDataBase();
    const { clerkId, searchQuery, filter, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;
    const escapedSearchQuery = escapeStringRegexp(searchQuery || '');
    const query: FilterQuery<typeof Question> = searchQuery
      ? { title: { $regex: new RegExp(escapedSearchQuery, 'i') } }
      : {};
    let sortOptions = {};

    switch (filter) {
      case 'most_recent':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'most_voted':
        sortOptions = { upvotes: -1 };
        break;
      case 'most_viewed':
        sortOptions = { views: -1 };
        break;
      case 'most_answered':
        sortOptions = { answers: -1 };
        break;

      default:
        break;
    }

    const user = await User.findOne({ clerkId }).populate({
      path: 'saved',
      model: Question,
      match: query,
      populate: [
        { path: 'author', model: User, select: '_id name clerkId picture' },
        { path: 'tags', model: Tag, select: '_id name' },
      ],
      options: { sort: sortOptions, skip: skipAmount, limit: pageSize + 1 },
    });
    if (!user) throw new Error('User not found');

    const isNext = user.saved.length > pageSize;
    const savedQuestions = user.saved.slice(0, pageSize);

    return { savedQuestions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getUserInfo(params: GetUserByIdParams) {
  try {
    connectToDataBase();
    const { userId } = params;
    const user = await User.findOne({ clerkId: userId });
    if (!user) throw new Error('User not found');
    const totalQuestions = await Question.countDocuments({ author: user._id });
    const totalAnswers = await Answer.countDocuments({ author: user._id });
    return { user, totalQuestions, totalAnswers };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getUserQuestions(params: GetUserStatsParams) {
  try {
    connectToDataBase();

    const { userId, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;

    const totalQuestions = await Question.countDocuments({ author: userId });

    const userQuestions = await Question.find({ author: userId })
      .sort({ createdAt: -1, views: -1, upvotes: -1 })
      .populate('tags', '_id name')
      .populate('author', '_id clerkId name picture')
      .skip(skipAmount)
      .limit(pageSize);
    const isNext = totalQuestions > skipAmount + pageSize;

    return { totalQuestions, questions: userQuestions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getUserAnswers(params: GetUserStatsParams) {
  try {
    connectToDataBase();

    const { userId, page = 1, pageSize = 10 } = params;
    const skipAmount = (page - 1) * pageSize;

    const totalAnswers = await Answer.countDocuments({ author: userId });

    const userAnswers = await Answer.find({ author: userId })
      .sort({ upvotes: -1 })
      .populate('question', '_id title')
      .populate('author', '_id clerkId name picture')
      .skip(skipAmount)
      .limit(pageSize);
    const isNext = totalAnswers > skipAmount + pageSize;

    return { totalAnswers, answers: userAnswers, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}
