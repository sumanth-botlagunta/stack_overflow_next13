'use server';

import Question from '@/database/question.model';
import { connectToDataBase } from '../mongoose';
import {
  CreateQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
  QuestionVoteParams,
} from './shared.types';
import Tag from '@/database/tag.model';
import { revalidatePath } from 'next/cache';
import console from 'console';
import User from '@/database/user.model';

export async function createQuestion(params: CreateQuestionParams) {
  try {
    connectToDataBase();
    const { title, content, tags, author, path } = params;
    const question = await Question.create({
      title,
      content,
      author,
    });

    const tagDocuments = [];
    for (const tag of tags) {
      const existingTag = await Tag.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${tag}$`, 'i') } },
        { $setOnInsert: { name: tag }, $push: { questions: question._id } },
        { upsert: true, new: true }
      );

      tagDocuments.push(existingTag._id);
    }

    await Question.findByIdAndUpdate(question._id, {
      $push: { tags: { $each: tagDocuments } },
    });
    revalidatePath(path);

    return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestions(params: GetQuestionsParams) {
  try {
    connectToDataBase();
    const questions = await Question.find({})
      .populate({ path: 'tags', model: Tag })
      .populate({ path: 'author', model: User })
      .sort({ createdAt: -1 });

    return { questions };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestionById(params: GetQuestionByIdParams) {
  try {
    connectToDataBase();
    const { questionId } = params;
    const question = await Question.findById(questionId)
      .populate({
        path: 'tags',
        model: Tag,
        select: '_id name',
      })
      .populate({
        path: 'author',
        model: User,
        select: '_id name clerkId picture',
      });
    return question;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteQuestion(params: QuestionVoteParams){
  try {
    connectToDataBase();
    const {hasupVoted, hasdownVoted, path, questionId, userId} = params;
    let updateQuery = {};
    if(hasupVoted){
      updateQuery = {
        $pull: {upvotes: userId},
      }
    }else if(hasdownVoted){
      updateQuery = {
        $pull: {downvotes: userId},
        $push: {upvotes: userId},
      }
    }else{
      updateQuery = {
        $addToSet: {upvotes: userId},
      }
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {new: true})

    if(!question){
      throw new Error('Question not found');
    }
    // TODO: authors reputation

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}; 

export async function downvoteQuestion(params: QuestionVoteParams){
  try {
    connectToDataBase();
    const {hasupVoted, hasdownVoted, path, questionId, userId} = params;
    let updateQuery = {};
    if(hasdownVoted){
      updateQuery = {
        $pull: {downvotes: userId},
      }
    }else if(hasupVoted){
      updateQuery = {
        $pull: {upvotes: userId},
        $push: {downvotes: userId},
      }
    }else{
      updateQuery = {
        $addToSet: {downvotes: userId},
      }
    }

    const question = await Question.findByIdAndUpdate(questionId, updateQuery, {new: true})

    if(!question){
      throw new Error('Question not found');
    }

    // TODO: authors reputation

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}; 
