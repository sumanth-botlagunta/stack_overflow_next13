'use server';

import Answer from '@/database/answer.model';
import { connectToDataBase } from '../mongoose';
import {
  AnswerVoteParams,
  CreateAnswerParams,
  DeleteAnswerParams,
  GetAnswersParams,
} from './shared.types';
import Question from '@/database/question.model';
import { revalidatePath } from 'next/cache';
import User from '@/database/user.model';
import Interaction from '@/database/interaction.model';

export async function createAnswer(params: CreateAnswerParams) {
  try {
    connectToDataBase();
    const { author, content, path, question } = params;
    const answer = await Answer.create({ author, content, question });
    await Question.findByIdAndUpdate(question, {
      $push: { answers: answer._id },
    });
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getAnswers(params: GetAnswersParams) {
  try {
    connectToDataBase();
    const { questionId } = params;

    const answers = await Answer.find({ question: questionId })
      .populate({
        path: 'author',
        model: User,
        select: '_id name picture clerkId',
      })
      .sort({ createdAt: -1 });
    return answers;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function upvoteAnswer(params: AnswerVoteParams) {
  try {
    connectToDataBase();
    const { hasupVoted, hasdownVoted, path, answerId, userId } = params;
    let updateQuery = {};
    if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId },
      };
    } else if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId },
        $push: { upvotes: userId },
      };
    } else {
      updateQuery = {
        $addToSet: { upvotes: userId },
      };
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
      new: true,
    });

    if (!answer) {
      throw new Error('Answer not found');
    }
    // TODO: authors reputation

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function downvoteAnswer(params: AnswerVoteParams) {
  try {
    connectToDataBase();
    const { hasupVoted, hasdownVoted, path, answerId, userId } = params;
    let updateQuery = {};
    if (hasdownVoted) {
      updateQuery = {
        $pull: { downvotes: userId },
      };
    } else if (hasupVoted) {
      updateQuery = {
        $pull: { upvotes: userId },
        $push: { downvotes: userId },
      };
    } else {
      updateQuery = {
        $addToSet: { downvotes: userId },
      };
    }

    const answer = await Answer.findByIdAndUpdate(answerId, updateQuery, {
      new: true,
    });

    if (!answer) {
      throw new Error('Answer not found');
    }

    // TODO: authors reputation

    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function deleteAnswer(params: DeleteAnswerParams) {
  try {
    connectToDataBase();
    const { answerId, path } = params;
    const answer = await Answer.findById(answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }
    await Answer.deleteOne({ _id: answerId });
    await Interaction.deleteMany({ answer: answerId });
    await Question.updateMany(
      { answers: answerId },
      { $pull: { answers: answerId } }
    );
    revalidatePath(path);
  } catch (error) {
    console.log(error);
    throw error;
  }
}
