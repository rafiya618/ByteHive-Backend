import notificationModel from "../models/notificationModel.js";

export async function cascadeDeletion(payload) {
    try {
        if (!payload) return;
        // console.log('payload in cascasde', payload)
        switch (payload?.type) {
            case "deleteComment":
                await notificationModel.deleteMany({groupKey: `reply:comment:${payload.comment._id}`})
                await notificationModel.deleteMany({groupKey: `likeComment:comment:${payload.comment._id}`})
                await notificationModel.deleteMany({parentId: `${payload.comment._id}`})
                return console.log('Enter in delte comment in cascase')

            case "deleteReply":
                await notificationModel.deleteMany({groupKey: `likeComment:reply:${payload?.comment?._id}`})

                return console.log('Enter in delte reply cascade')

            default:
                return

        }
    } catch (error) {

    }
}