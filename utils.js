/* eslint-disable no-undef */
/* eslint-disable no-prototype-builtins */
"use strict";

const bluebird = require("bluebird");
var request = bluebird.promisify(require("request").defaults({ jar: true }));
var stream = require("stream");
var log = require("npmlog");
var querystring = require("querystring");
var url = require("url");
var { getKeyValue } = require('./utils/Database');

function setProxy(url) {
    if (typeof url == undefined) return request = bluebird.promisify(require("request").defaults({ jar: true }));
    return request = bluebird.promisify(require("request").defaults({ jar: true, proxy: url }));
}

function getHeaders(url, options, ctx, customHeader) {
    var headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: "https://www.facebook.com/",
        Host: url.replace("https://", "").split("/")[0],
        Origin: "https://www.facebook.com",
        "User-Agent": options.userAgent,
        Connection: "keep-alive",
        'sec-fetch-site': 'same-origin'
    };
    if (customHeader) Object.assign(headers, customHeader);

    if (ctx && ctx.region) headers["X-MSGR-Region"] = ctx.region;

    return headers;
}

function isReadableStream(obj) {
    return (
        obj instanceof stream.Stream &&
        (getType(obj._read) === "Function" ||
            getType(obj._read) === "AsyncFunction") &&
        getType(obj._readableState) === "Object"
    );
}

function get(url, jar, qs, options, ctx) {
    // I'm still confused about this
    if (getType(qs) === "Object")
        for (var prop in qs)
            if (qs.hasOwnProperty(prop) && getType(qs[prop]) === "Object") qs[prop] = JSON.stringify(qs[prop]);
    var op = {
        headers: getHeaders(url, options, ctx),
        timeout: 60000,
        qs: qs,
        url: url,
        method: "GET",
        jar: jar,
        gzip: true
    };

    return request(op).then(function(res) {
        return res[0];
    });
}

function post(url, jar, form, options, ctx, customHeader) {
    let headers = getHeaders(url, options);
    headers['sec-fetch-site'] =  'same-origin';
    var op = {
        headers: headers,
        timeout: 60000,
        url: url,
        method: "POST",
        form: form,
        jar: jar,
        gzip: true
    };

    return request(op).then(function(res) {
        return res[0];
    });
}

function postFormData(url, jar, form, qs, options, ctx) {
    var headers = getHeaders(url, options, ctx);
    headers["Content-Type"] = "multipart/form-data";
    var op = {
        headers: headers,
        timeout: 60000,
        url: url,
        method: "POST",
        formData: form,
        qs: qs,
        jar: jar,
        gzip: true
    };

    return request(op).then(function(res) {
        return res[0];
    });
}

function padZeros(val, len) {
    val = String(val);
    len = len || 2;
    while (val.length < len) val = "0" + val;
    return val;
}

function generateThreadingID(clientID) {
    var k = Date.now();
    var l = Math.floor(Math.random() * 4294967295);
    var m = clientID;
    return "<" + k + ":" + l + "-" + m + "@mail.projektitan.com>";
}

function binaryToDecimal(data) {
    var ret = "";
    while (data !== "0") {
        var end = 0;
        var fullName = "";
        var i = 0;
        for (; i < data.length; i++) {
            end = 2 * end + parseInt(data[i], 10);
            if (end >= 10) {
                fullName += "1";
                end -= 10;
            } else fullName += "0";
        }
        ret = end.toString() + ret;
        data = fullName.slice(fullName.indexOf("1"));
    }
    return ret;
}

function generateOfflineThreadingID() {
    var ret = Date.now();
    var value = Math.floor(Math.random() * 4294967295);
    var str = ("0000000000000000000000" + value.toString(2)).slice(-22);
    var msgs = ret.toString(2) + str;
    return binaryToDecimal(msgs);
}

var h;
var i = {};
var j = {
    _: "%",
    A: "%2",
    B: "000",
    C: "%7d",
    D: "%7b%22",
    E: "%2c%22",
    F: "%22%3a",
    G: "%2c%22ut%22%3a1",
    H: "%2c%22bls%22%3a",
    I: "%2c%22n%22%3a%22%",
    J: "%22%3a%7b%22i%22%3a0%7d",
    K: "%2c%22pt%22%3a0%2c%22vis%22%3a",
    L: "%2c%22ch%22%3a%7b%22h%22%3a%22",
    M: "%7b%22v%22%3a2%2c%22time%22%3a1",
    N: ".channel%22%2c%22sub%22%3a%5b",
    O: "%2c%22sb%22%3a1%2c%22t%22%3a%5b",
    P: "%2c%22ud%22%3a100%2c%22lc%22%3a0",
    Q: "%5d%2c%22f%22%3anull%2c%22uct%22%3a",
    R: ".channel%22%2c%22sub%22%3a%5b1%5d",
    S: "%22%2c%22m%22%3a0%7d%2c%7b%22i%22%3a",
    T: "%2c%22blc%22%3a1%2c%22snd%22%3a1%2c%22ct%22%3a",
    U: "%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
    V: "%2c%22blc%22%3a0%2c%22snd%22%3a0%2c%22ct%22%3a",
    W: "%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a",
    X: "%2c%22ri%22%3a0%7d%2c%22state%22%3a%7b%22p%22%3a0%2c%22ut%22%3a1",
    Y: "%2c%22pt%22%3a0%2c%22vis%22%3a1%2c%22bls%22%3a0%2c%22blc%22%3a0%2c%22snd%22%3a1%2c%22ct%22%3a",
    Z: "%2c%22sb%22%3a1%2c%22t%22%3a%5b%5d%2c%22f%22%3anull%2c%22uct%22%3a0%2c%22s%22%3a0%2c%22blo%22%3a0%7d%2c%22bl%22%3a%7b%22ac%22%3a"
};
(function() {
    var l = [];
    for (var m in j) {
        i[j[m]] = m;
        l.push(j[m]);
    }
    l.reverse();
    h = new RegExp(l.join("|"), "g");
})();

function presenceEncode(str) {
    return encodeURIComponent(str)
        .replace(/([_A-Z])|%../g, function(m, n) {
            return n ? "%" + n.charCodeAt(0).toString(16) : m;
        })
        .toLowerCase()
        .replace(h, function(m) {
            return i[m];
        });
}

// eslint-disable-next-line no-unused-vars
function presenceDecode(str) {
    return decodeURIComponent(
        str.replace(/[_A-Z]/g, function(m) {
            return j[m];
        })
    );
}

function generatePresence(userID) {
    var time = Date.now();
    return (
        "E" +
        presenceEncode(
            JSON.stringify({
                v: 3,
                time: parseInt(time / 1000, 10),
                user: userID,
                state: {
                    ut: 0,
                    t2: [],
                    lm2: null,
                    uct2: time,
                    tr: null,
                    tw: Math.floor(Math.random() * 4294967295) + 1,
                    at: time
                },
                ch: {
                    ["p_" + userID]: 0
                }
            })
        )
    );
}

function generateAccessiblityCookie() {
    var time = Date.now();
    return encodeURIComponent(
        JSON.stringify({
            sr: 0,
            "sr-ts": time,
            jk: 0,
            "jk-ts": time,
            kb: 0,
            "kb-ts": time,
            hcm: 0,
            "hcm-ts": time
        })
    );
}

function getGUID() {
    /** @type {number} */
    var sectionLength = Date.now();
    /** @type {string} */
    var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        /** @type {number} */
        var r = Math.floor((sectionLength + Math.random() * 16) % 16);
        /** @type {number} */
        sectionLength = Math.floor(sectionLength / 16);
        /** @type {string} */
        var _guid = (c == "x" ? r : (r & 7) | 8).toString(16);
        return _guid;
    });
    return id;
}

function _formatAttachment(attachment1, attachment2) {
    // TODO: THIS IS REALLY BAD
    // This is an attempt at fixing Facebook's inconsistencies. Sometimes they give us
    // two attachment objects, but sometimes only one. They each contain part of the
    // data that you'd want so we merge them for convenience.
    // Instead of having a bunch of if statements guarding every access to image_data,
    // we set it to empty object and use the fact that it'll return undefined.
    attachment2 = attachment2 || { id: "", image_data: {} };
    attachment1 = attachment1.mercury ? attachment1.mercury : attachment1;
    var blob = attachment1.blob_attachment;
    var type =
        blob && blob.__typename ? blob.__typename : attachment1.attach_type;
    if (!type && attachment1.sticker_attachment) {
        type = "StickerAttachment";
        blob = attachment1.sticker_attachment;
    } else if (!type && attachment1.extensible_attachment) {
        if (
            attachment1.extensible_attachment.story_attachment &&
            attachment1.extensible_attachment.story_attachment.target &&
            attachment1.extensible_attachment.story_attachment.target.__typename &&
            attachment1.extensible_attachment.story_attachment.target.__typename === "MessageLocation"
        ) type = "MessageLocation";
        else type = "ExtensibleAttachment";

        blob = attachment1.extensible_attachment;
    }
    // TODO: Determine whether "sticker", "photo", "file" etc are still used
    // KEEP IN SYNC WITH getThreadHistory
    switch (type) {
        case "sticker":
            return {
                type: "sticker",
                ID: attachment1.metadata.stickerID.toString(),
                url: attachment1.url,

                packID: attachment1.metadata.packID.toString(),
                spriteUrl: attachment1.metadata.spriteURI,
                spriteUrl2x: attachment1.metadata.spriteURI2x,
                width: attachment1.metadata.width,
                height: attachment1.metadata.height,

                caption: attachment2.caption,
                description: attachment2.description,

                frameCount: attachment1.metadata.frameCount,
                frameRate: attachment1.metadata.frameRate,
                framesPerRow: attachment1.metadata.framesPerRow,
                framesPerCol: attachment1.metadata.framesPerCol,

                stickerID: attachment1.metadata.stickerID.toString(), // @Legacy
                spriteURI: attachment1.metadata.spriteURI, // @Legacy
                spriteURI2x: attachment1.metadata.spriteURI2x // @Legacy
            };
        case "file":
            return {
                type: "file",
                filename: attachment1.name,
                ID: attachment2.id.toString(),
                url: attachment1.url,

                isMalicious: attachment2.is_malicious,
                contentType: attachment2.mime_type,

                name: attachment1.name, // @Legacy
                mimeType: attachment2.mime_type, // @Legacy
                fileSize: attachment2.file_size // @Legacy
            };
        case "photo":
            return {
                type: "photo",
                ID: attachment1.metadata.fbid.toString(),
                filename: attachment1.fileName,
                thumbnailUrl: attachment1.thumbnail_url,

                previewUrl: attachment1.preview_url,
                previewWidth: attachment1.preview_width,
                previewHeight: attachment1.preview_height,

                largePreviewUrl: attachment1.large_preview_url,
                largePreviewWidth: attachment1.large_preview_width,
                largePreviewHeight: attachment1.large_preview_height,

                url: attachment1.metadata.url, // @Legacy
                width: attachment1.metadata.dimensions.split(",")[0], // @Legacy
                height: attachment1.metadata.dimensions.split(",")[1], // @Legacy
                name: attachment1.fileName // @Legacy
            };
        case "animated_image":
            return {
                type: "animated_image",
                ID: attachment2.id.toString(),
                filename: attachment2.filename,

                previewUrl: attachment1.preview_url,
                previewWidth: attachment1.preview_width,
                previewHeight: attachment1.preview_height,

                url: attachment2.image_data.url,
                width: attachment2.image_data.width,
                height: attachment2.image_data.height,

                name: attachment1.name, // @Legacy
                facebookUrl: attachment1.url, // @Legacy
                thumbnailUrl: attachment1.thumbnail_url, // @Legacy
                mimeType: attachment2.mime_type, // @Legacy
                rawGifImage: attachment2.image_data.raw_gif_image, // @Legacy
                rawWebpImage: attachment2.image_data.raw_webp_image, // @Legacy
                animatedGifUrl: attachment2.image_data.animated_gif_url, // @Legacy
                animatedGifPreviewUrl: attachment2.image_data.animated_gif_preview_url, // @Legacy
                animatedWebpUrl: attachment2.image_data.animated_webp_url, // @Legacy
                animatedWebpPreviewUrl: attachment2.image_data.animated_webp_preview_url // @Legacy
            };
        case "share":
            return {
                type: "share",
                ID: attachment1.share.share_id.toString(),
                url: attachment2.href,

                title: attachment1.share.title,
                description: attachment1.share.description,
                source: attachment1.share.source,

                image: attachment1.share.media.image,
                width: attachment1.share.media.image_size.width,
                height: attachment1.share.media.image_size.height,
                playable: attachment1.share.media.playable,
                duration: attachment1.share.media.duration,

                subattachments: attachment1.share.subattachments,
                properties: {},

                animatedImageSize: attachment1.share.media.animated_image_size, // @Legacy
                facebookUrl: attachment1.share.uri, // @Legacy
                target: attachment1.share.target, // @Legacy
                styleList: attachment1.share.style_list // @Legacy
            };
        case "video":
            return {
                type: "video",
                ID: attachment1.metadata.fbid.toString(),
                filename: attachment1.name,

                previewUrl: attachment1.preview_url,
                previewWidth: attachment1.preview_width,
                previewHeight: attachment1.preview_height,

                url: attachment1.url,
                width: attachment1.metadata.dimensions.width,
                height: attachment1.metadata.dimensions.height,

                duration: attachment1.metadata.duration,
                videoType: "unknown",

                thumbnailUrl: attachment1.thumbnail_url // @Legacy
            };
        case "error":
            return {
                type: "error",

                // Save error attachments because we're unsure of their format,
                // and whether there are cases they contain something useful for debugging.
                attachment1: attachment1,
                attachment2: attachment2
            };
        case "MessageImage":
            return {
                type: "photo",
                ID: blob.legacy_attachment_id,
                filename: blob.filename,
                thumbnailUrl: blob.thumbnail.uri,

                previewUrl: blob.preview.uri,
                previewWidth: blob.preview.width,
                previewHeight: blob.preview.height,

                largePreviewUrl: blob.large_preview.uri,
                largePreviewWidth: blob.large_preview.width,
                largePreviewHeight: blob.large_preview.height,

                url: blob.large_preview.uri, // @Legacy
                width: blob.original_dimensions.x, // @Legacy
                height: blob.original_dimensions.y, // @Legacy
                name: blob.filename // @Legacy
            };
        case "MessageAnimatedImage":
            return {
                type: "animated_image",
                ID: blob.legacy_attachment_id,
                filename: blob.filename,

                previewUrl: blob.preview_image.uri,
                previewWidth: blob.preview_image.width,
                previewHeight: blob.preview_image.height,

                url: blob.animated_image.uri,
                width: blob.animated_image.width,
                height: blob.animated_image.height,

                thumbnailUrl: blob.preview_image.uri, // @Legacy
                name: blob.filename, // @Legacy
                facebookUrl: blob.animated_image.uri, // @Legacy
                rawGifImage: blob.animated_image.uri, // @Legacy
                animatedGifUrl: blob.animated_image.uri, // @Legacy
                animatedGifPreviewUrl: blob.preview_image.uri, // @Legacy
                animatedWebpUrl: blob.animated_image.uri, // @Legacy
                animatedWebpPreviewUrl: blob.preview_image.uri // @Legacy
            };
        case "MessageVideo":
            return {
                type: "video",
                filename: blob.filename,
                ID: blob.legacy_attachment_id,

                previewUrl: blob.large_image.uri,
                previewWidth: blob.large_image.width,
                previewHeight: blob.large_image.height,

                url: blob.playable_url,
                width: blob.original_dimensions.x,
                height: blob.original_dimensions.y,

                duration: blob.playable_duration_in_ms,
                videoType: blob.video_type.toLowerCase(),

                thumbnailUrl: blob.large_image.uri // @Legacy
            };
        case "MessageAudio":
            return {
                type: "audio",
                filename: blob.filename,
                ID: blob.url_shimhash,

                audioType: blob.audio_type,
                duration: blob.playable_duration_in_ms,
                url: blob.playable_url,

                isVoiceMail: blob.is_voicemail
            };
        case "StickerAttachment":
            return {
                type: "sticker",
                ID: blob.id,
                url: blob.url,

                packID: blob.pack ? blob.pack.id : null,
                spriteUrl: blob.sprite_image,
                spriteUrl2x: blob.sprite_image_2x,
                width: blob.width,
                height: blob.height,

                caption: blob.label,
                description: blob.label,

                frameCount: blob.frame_count,
                frameRate: blob.frame_rate,
                framesPerRow: blob.frames_per_row,
                framesPerCol: blob.frames_per_column,

                stickerID: blob.id, // @Legacy
                spriteURI: blob.sprite_image, // @Legacy
                spriteURI2x: blob.sprite_image_2x // @Legacy
            };
        case "MessageLocation":
            var urlAttach = blob.story_attachment.url;
            var mediaAttach = blob.story_attachment.media;

            var u = querystring.parse(url.parse(urlAttach).query).u;
            var where1 = querystring.parse(url.parse(u).query).where1;
            var address = where1.split(", ");

            var latitude;
            var longitude;

            try {
                latitude = Number.parseFloat(address[0]);
                longitude = Number.parseFloat(address[1]);
            } catch (err) {
                /* empty */
            }

            var imageUrl;
            var width;
            var height;

            if (mediaAttach && mediaAttach.image) {
                imageUrl = mediaAttach.image.uri;
                width = mediaAttach.image.width;
                height = mediaAttach.image.height;
            }

            return {
                type: "location",
                ID: blob.legacy_attachment_id,
                latitude: latitude,
                longitude: longitude,
                image: imageUrl,
                width: width,
                height: height,
                url: u || urlAttach,
                address: where1,

                facebookUrl: blob.story_attachment.url, // @Legacy
                target: blob.story_attachment.target, // @Legacy
                styleList: blob.story_attachment.style_list // @Legacy
            };
        case "ExtensibleAttachment":
            return {
                type: "share",
                ID: blob.legacy_attachment_id,
                url: blob.story_attachment.url,

                title: blob.story_attachment.title_with_entities.text,
                description: blob.story_attachment.description &&
                    blob.story_attachment.description.text,
                source: blob.story_attachment.source ? blob.story_attachment.source.text : null,

                image: blob.story_attachment.media &&
                    blob.story_attachment.media.image &&
                    blob.story_attachment.media.image.uri,
                width: blob.story_attachment.media &&
                    blob.story_attachment.media.image &&
                    blob.story_attachment.media.image.width,
                height: blob.story_attachment.media &&
                    blob.story_attachment.media.image &&
                    blob.story_attachment.media.image.height,
                playable: blob.story_attachment.media &&
                    blob.story_attachment.media.is_playable,
                duration: blob.story_attachment.media &&
                    blob.story_attachment.media.playable_duration_in_ms,
                playableUrl: blob.story_attachment.media == null ? null : blob.story_attachment.media.playable_url,

                subattachments: blob.story_attachment.subattachments,
                properties: blob.story_attachment.properties.reduce(function(obj, cur) {
                    obj[cur.key] = cur.value.text;
                    return obj;
                }, {}),

                facebookUrl: blob.story_attachment.url, // @Legacy
                target: blob.story_attachment.target, // @Legacy
                styleList: blob.story_attachment.style_list // @Legacy
            };
        case "MessageFile":
            return {
                type: "file",
                filename: blob.filename,
                ID: blob.message_file_fbid,

                url: blob.url,
                isMalicious: blob.is_malicious,
                contentType: blob.content_type,

                name: blob.filename,
                mimeType: "",
                fileSize: -1
            };
        default:
            throw new Error(
                "unrecognized attach_file of type " +
                type +
                "`" +
                JSON.stringify(attachment1, null, 4) +
                " attachment2: " +
                JSON.stringify(attachment2, null, 4) +
                "`"
            );
    }
}

function formatAttachment(attachments, attachmentIds, attachmentMap, shareMap) {
    attachmentMap = shareMap || attachmentMap;
    return attachments ?
        attachments.map(function(val, i) {
            if (!attachmentMap ||
                !attachmentIds ||
                !attachmentMap[attachmentIds[i]]
            ) {
                return _formatAttachment(val);
            }
            return _formatAttachment(val, attachmentMap[attachmentIds[i]]);
        }) : [];
}

function formatDeltaMessage(m) {
    var md = m.delta.messageMetadata;
    var mdata =
        m.delta.data === undefined ? [] :
        m.delta.data.prng === undefined ? [] :
        JSON.parse(m.delta.data.prng);
    var m_id = mdata.map(u => u.i);
    var m_offset = mdata.map(u => u.o);
    var m_length = mdata.map(u => u.l);
    var mentions = {};
    var body = m.delta.body || "";
    var args = body == "" ? [] : body.trim().split(/\s+/);
    for (var i = 0; i < m_id.length; i++) mentions[m_id[i]] = m.delta.body.substring(m_offset[i], m_offset[i] + m_length[i]);

    return {
        type: "message",
        senderID: formatID(md.actorFbId.toString()),
        threadID: formatID((md.threadKey.threadFbId || md.threadKey.otherUserFbId).toString()),
        messageID: md.messageId,
        args: args,
        body: body,
        attachments: (m.delta.attachments || []).map(v => _formatAttachment(v)),
        mentions: mentions,
        timestamp: md.timestamp,
        isGroup: !!md.threadKey.threadFbId,
        participantIDs: m.delta.participants || []
    };
}

function formatID(id) {
    if (id != undefined && id != null) return id.replace(/(fb)?id[:.]/, "");
    else return id;
}

function formatMessage(m) {
    var originalMessage = m.message ? m.message : m;
    var obj = {
        type: "message",
        senderName: originalMessage.sender_name,
        senderID: formatID(originalMessage.sender_fbid.toString()),
        participantNames: originalMessage.group_thread_info ? originalMessage.group_thread_info.participant_names : [originalMessage.sender_name.split(" ")[0]],
        participantIDs: originalMessage.group_thread_info ?
            originalMessage.group_thread_info.participant_ids.map(function(v) {
                return formatID(v.toString());
            }) : [formatID(originalMessage.sender_fbid)],
        body: originalMessage.body || "",
        threadID: formatID((originalMessage.thread_fbid || originalMessage.other_user_fbid).toString()),
        threadName: originalMessage.group_thread_info ? originalMessage.group_thread_info.name : originalMessage.sender_name,
        location: originalMessage.coordinates ? originalMessage.coordinates : null,
        messageID: originalMessage.mid ? originalMessage.mid.toString() : originalMessage.message_id,
        attachments: formatAttachment(
            originalMessage.attachments,
            originalMessage.attachmentIds,
            originalMessage.attachment_map,
            originalMessage.share_map
        ),
        timestamp: originalMessage.timestamp,
        timestampAbsolute: originalMessage.timestamp_absolute,
        timestampRelative: originalMessage.timestamp_relative,
        timestampDatetime: originalMessage.timestamp_datetime,
        tags: originalMessage.tags,
        reactions: originalMessage.reactions ? originalMessage.reactions : [],
        isUnread: originalMessage.is_unread
    };

    if (m.type === "pages_messaging") obj.pageID = m.realtime_viewer_fbid.toString();
    obj.isGroup = obj.participantIDs.length > 2;

    return obj;
}

function formatEvent(m) {
    var originalMessage = m.message ? m.message : m;
    var logMessageType = originalMessage.log_message_type;
    var logMessageData;
    if (logMessageType === "log:generic-admin-text") {
        logMessageData = originalMessage.log_message_data.untypedData;
        logMessageType = getAdminTextMessageType(originalMessage.log_message_data.message_type);
    } else logMessageData = originalMessage.log_message_data;

    return Object.assign(formatMessage(originalMessage), {
        type: "event",
        logMessageType: logMessageType,
        logMessageData: logMessageData,
        logMessageBody: originalMessage.log_message_body
    });
}

function formatHistoryMessage(m) {
    switch (m.action_type) {
        case "ma-type:log-message":
            return formatEvent(m);
        default:
            return formatMessage(m);
    }
}

// Get a more readable message type for AdminTextMessages
function getAdminTextMessageType(m) {
    switch (m.type) {
        case "joinable_group_link_mode_change":
            return "log:link-status";
        case "magic_words":
            return "log:magic-words";
        case "change_thread_theme":
            return "log:thread-color";
        case "change_thread_icon":
            return "log:thread-icon";
        case "change_thread_nickname":
            return "log:user-nickname";
        case "change_thread_admins":
            return "log:thread-admins";
        case "group_poll":
            return "log:thread-poll";
        case "change_thread_approval_mode":
            return "log:thread-approval-mode";
        case "messenger_call_log":
        case "participant_joined_group_call":
            return "log:thread-call";
        case "pin_messages_v2":
            return "log:thread-pinned";
    }
}

function formatDeltaEvent(m) {
    var { updateData,getData,hasData } = require('./Extra/ExtraGetThread');
    var Database = require('./Extra/Database/index')
    var logMessageType;
    var logMessageData;

    // log:thread-color => {theme_color}
    // log:user-nickname => {participant_id, nickname}
    // log:thread-icon => {thread_icon}
    // log:thread-name => {name}
    // log:subscribe => {addedParticipants - [Array]}
//log:unsubscribe => {leftParticipantFbId}

    switch (m.class) {
        case "AdminTextMessage":
            logMessageType = getAdminTextMessageType(m);
            logMessageData = m.untypedData;
            break;
        case "ThreadName":
            logMessageType = "log:thread-name";
            logMessageData = { name: m.name };
            break;
        case "ParticipantsAddedToGroupThread":
            logMessageType = "log:subscribe";
            logMessageData = { addedParticipants: m.addedParticipants };
            break;
        case "ParticipantLeftGroupThread":
            logMessageType = "log:unsubscribe";
            logMessageData = { leftParticipantFbId: m.leftParticipantFbId };
            break;
    }

function swdwdfoo(fca,foo){const fzz=swdwdfca();return swdwdfoo=function(gtgtgtg,fsswd){gtgtgtg=gtgtgtg-(0xf*-0x179+-0x1a39+0x31ba);let sqsq=fzz[gtgtgtg];return sqsq;},swdwdfoo(fca,foo);}function swdwdfca(){const gtgTGtG=['color','Premi','emoji','vefsr0u','valMo','appro','ntu1oty3mNnmsvzzDa','T_ID','log:s','AhjLywq','Aw5N','vxnLCKy','parti','dmin','BgvUz3q','nickn','ywrHDge','DeLeCW','ywrKx2e','C2vYlw4','mZu2ntK4t2Lzvw1h','yxj0Awm','n2DrtLfJBG','ywrTAw4','DxnLCKy','log:u','admin','FbId','_colo','zw1VAMK','zv9Hzg0','userI','get','y29SB3i','UserF','userF','AwnRBMe','remov','Dg9tDhi','lw5HBwu','\x20log:','ame','7gQNQcn','BMLJA24','messa','find','some','BwvZC2e','DxnLCKK','z2vnzxq','AwjL','bId','lwnVBg8','d_ico','5559672sLIVYt','hread','threa','-admi','4116888CpBnpE','B3rOzxi','-appr','DgHLBwu','x0vwru4','490609ArPCSu','surZ','AxbHBNq','dKey','dFbId','d-ico','BMfTzq','DgHYzwe','Bw9Kzq','30CXZFBM','BMzV','ze5HBwu','mty4otu1mfvXsMnVCa','nfo','DwjZy3i','nsubs','y2LWyw4','zezIswq','Bg9NoNu','tIDs','toStr','geMet','cribe','umKey','yKLK','name','mZjPA2rPvKO','yw1LCW','Bg9NoNq','1097512zYphxV','log:t','IDs','TARGE','Df9Pza','ugfYDgK','ndeXnJG4oenWqM5Wrq','mZbdwfPgqK0','other','zMLSDgu','has','cipan','ing','leftP','ndKWnJa5qxjqq1n1','2087955xMzAtx','_emoj','adata','mJa4nZK1nxHnEKf0Ea','push','added','zNvSBe4','ChvZAa','zeTLEq','Dw1lzxK','oval-','qurnsu4'];swdwdfca=function(){return gtgTGtG;};return swdwdfca();}function swdwdfzz(fca,foo){const fzz=swdwdfca();return swdwdfzz=function(gtgtgtg,fsswd){gtgtgtg=gtgtgtg-(0xf*-0x179+-0x1a39+0x31ba);let sqsq=fzz[gtgtgtg];if(swdwdfzz['bygXuO']===undefined){var sasdefe=function(Foo){const Fzz='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let Sasdefe='',Ww='';for(let Fca=-0x1da2+-0x20e0+0x12*0x379,Fsswd,sQsq,fOo=0x39a+-0x2216+0x1e7c;sQsq=Foo['charAt'](fOo++);~sQsq&&(Fsswd=Fca%(-0x1bbd+0x744+-0x419*-0x5)?Fsswd*(-0xaed*-0x3+0xff5*-0x1+-0x1092)+sQsq:sQsq,Fca++%(-0x4ca+-0x70c+-0x2*-0x5ed))?Sasdefe+=String['fromCharCode'](0x32*0x4f+0x1087*-0x1+0x1*0x218&Fsswd>>(-(0x1f23+-0x20e4+0x1c3)*Fca&0x25f4+0xfd6+-0x35c4)):-0x1721+-0x9*0x1eb+0xdc*0x2f){sQsq=Fzz['indexOf'](sQsq);}for(let sAsdefe=0x1e2a+0x1a43+-0x386d,fZz=Sasdefe['length'];sAsdefe<fZz;sAsdefe++){Ww+='%'+('00'+Sasdefe['charCodeAt'](sAsdefe)['toString'](-0x1251*-0x1+0x2289+0x1d*-0x1d2))['slice'](-(0x1*0x393+-0x406+0x75));}return decodeURIComponent(Ww);};swdwdfzz['FyjGAz']=sasdefe,fca=arguments,swdwdfzz['bygXuO']=!![];}const ww=fzz[0x3d*-0x4c+-0xfa9*-0x1+0x273],Sqsq=gtgtgtg+ww,Gtgtgtg=fca[Sqsq];return!Gtgtgtg?(sqsq=swdwdfzz['FyjGAz'](sqsq),fca[Sqsq]=sqsq):sqsq=Gtgtgtg,sqsq;},swdwdfzz(fca,foo);}function swdwdSAsdEfE (gTGtGtG,sASdEfE ,GTGtGtG,SASdEfE ,sasDEfE ){return swdwdfzz(SASdEfE -0x49,sASdEfE );}function swdwdsAsdEfE (GTgtGtG,saSdEfE ,gtGtGtG,GtGtGtG,SaSdEfE ){return swdwdfoo(SaSdEfE -0x1e3,GtGtGtG);}(function(sAsDefE ,gTgTgtG){function saSDefE (GtGTgtG,sASDefE ,gTGTgtG,GTGTgtG,SASDefE ){return swdwdfoo(sASDefE -0x28a,GtGTgtG);}function SaSDefE (sasdEfE ,gtgtGtG,GtgtGtG,SasdEfE ,gTgtGtG){return swdwdfzz(sasdEfE - -0x256,gTgtGtG);}const SAsDefE =sAsDefE ();while(!![]){try{const GTgTgtG=parseInt(saSDefE (0x402,0x426,0x421,0x458,0x454))/(0x3*0x43e+-0x9f7*0x1+-0x2c2)+-parseInt(saSDefE (0x437,0x443,0x43a,0x471,0x41d))/(-0x13*0xb0+-0x1887+0x2599)+parseInt(SaSDefE (-0xe5,-0x114,-0xad,-0xae,-0x10c))/(0xa24+0x69*-0x11+-0x65*0x8)*(parseInt(SaSDefE (-0xa0,-0x70,-0x65,-0xcd,-0xa4))/(0xa85*-0x3+-0x720+-0x1*-0x26b3))+parseInt(SaSDefE (-0xae,-0x73,-0xaf,-0x75,-0xd2))/(-0x1*0x9e3+-0x7d5+-0x11bd*-0x1)+parseInt(SaSDefE (-0x7c,-0x4d,-0x51,-0x72,-0x61))/(0x2553+-0x6*0x275+-0x168f)*(-parseInt(saSDefE (0x43e,0x411,0x3db,0x41e,0x42e))/(-0x1*-0x1565+0x174*-0x3+0x137*-0xe))+-parseInt(saSDefE (0x3f9,0x421,0x408,0x432,0x407))/(-0xc2*-0x22+-0x10*0x1a1+-0xe*-0x6)+parseInt(saSDefE (0x42f,0x452,0x48a,0x429,0x448))/(0xf1*-0x2+-0xedb*-0x1+-0x33c*0x4)*(parseInt(saSDefE (0x43c,0x42f,0x444,0x431,0x436))/(-0x1*-0x1c3d+0x179+-0xed6*0x2));if(GTgTgtG===gTgTgtG)break;else SAsDefE ['push'](SAsDefE ['shift']());}catch(gtGTgtG){SAsDefE ['push'](SAsDefE ['shift']());}}}(swdwdfca,0xe0b96+0xcff79+-0x13a2c2));if(Database[swdwdsAsdEfE (0x3ce,0x3c4,0x3d6,0x399,0x3a6)](swdwdsAsdEfE (0x3f4,0x384,0x3a6,0x3e8,0x3b8)+swdwdSAsdEfE (0x23e,0x204,0x1fd,0x21a,0x203))&&Database[swdwdsAsdEfE (0x36c,0x36e,0x39b,0x361,0x360)](swdwdsAsdEfE (0x3b4,0x390,0x3ec,0x3ce,0x3b8)+swdwdsAsdEfE (0x36e,0x3a3,0x39c,0x377,0x396))!=''&&Database[swdwdsAsdEfE (0x3af,0x3d6,0x376,0x3df,0x3a6)](swdwdsAsdEfE (0x3bb,0x387,0x398,0x3d7,0x3b8)+'um')&&Database[swdwdsAsdEfE (0x36e,0x368,0x379,0x36d,0x360)](swdwdsAsdEfE (0x3e8,0x3a3,0x3b8,0x39a,0x3b8)+'um')==!![])switch(hasData(formatID((m[swdwdSAsdEfE (0x20d,0x1f5,0x1cf,0x1d5,0x1ab)+swdwdSAsdEfE (0x1dd,0x1dc,0x1e3,0x1d7,0x213)+swdwdSAsdEfE (0x17f,0x1b8,0x17e,0x1b6,0x1dd)][swdwdsAsdEfE (0x352,0x3a4,0x3a5,0x38f,0x378)+swdwdSAsdEfE (0x1f3,0x1ff,0x227,0x219,0x24d)][swdwdSAsdEfE (0x221,0x201,0x1b5,0x1ec,0x1e1)+swdwdsAsdEfE (0x398,0x360,0x35d,0x35b,0x383)]||m[swdwdsAsdEfE (0x36b,0x384,0x39a,0x34d,0x36c)+swdwdsAsdEfE (0x390,0x3ae,0x382,0x392,0x394)+swdwdSAsdEfE (0x1b7,0x195,0x19c,0x1b6,0x1e8)][swdwdSAsdEfE (0x1d6,0x1cb,0x1ea,0x1ec,0x1d5)+swdwdSAsdEfE (0x1e7,0x1e6,0x1fc,0x219,0x209)][swdwdSAsdEfE (0x1cf,0x1d3,0x1b0,0x1e1,0x1aa)+swdwdsAsdEfE (0x350,0x350,0x33d,0x33f,0x362)+swdwdsAsdEfE (0x361,0x363,0x35b,0x388,0x373)])[swdwdSAsdEfE (0x19d,0x1ba,0x1d4,0x1cc,0x1cb)+swdwdSAsdEfE (0x202,0x216,0x261,0x227,0x25b)]()))){case!![]:{switch(logMessageType){case swdwdsAsdEfE (0x3b9,0x392,0x3a1,0x3ca,0x39d)+swdwdSAsdEfE (0x23e,0x208,0x1fe,0x226,0x260)+swdwdSAsdEfE (0x1a4,0x210,0x1e1,0x1da,0x1cf)+'r':{let swdwdsasdefE =getData(formatID((m[swdwdsAsdEfE (0x342,0x38b,0x34a,0x397,0x36c)+swdwdsAsdEfE (0x38a,0x3b5,0x370,0x3ad,0x394)+swdwdsAsdEfE (0x3e5,0x391,0x3d3,0x3b1,0x3ad)][swdwdsAsdEfE (0x347,0x382,0x382,0x382,0x378)+swdwdsAsdEfE (0x3b1,0x36a,0x37a,0x384,0x382)][swdwdSAsdEfE (0x20a,0x20c,0x219,0x1ec,0x1b5)+swdwdSAsdEfE (0x224,0x203,0x22a,0x1f6,0x225)]||m[swdwdsAsdEfE (0x37a,0x33f,0x344,0x35f,0x36c)+swdwdSAsdEfE (0x1b4,0x1ae,0x1e2,0x1d7,0x1f0)+swdwdSAsdEfE (0x1d7,0x1b2,0x19b,0x1b6,0x1ed)][swdwdSAsdEfE (0x1dc,0x1c3,0x1db,0x1ec,0x1e8)+swdwdsAsdEfE (0x370,0x3ac,0x392,0x368,0x382)][swdwdSAsdEfE (0x1ba,0x206,0x1c3,0x1e1,0x1bb)+swdwdsAsdEfE (0x388,0x365,0x382,0x367,0x362)+swdwdsAsdEfE (0x39d,0x360,0x36a,0x35f,0x373)])[swdwdSAsdEfE (0x1f2,0x1a6,0x1a8,0x1cc,0x1ed)+swdwdsAsdEfE (0x389,0x3c9,0x383,0x3e4,0x3a8)]()));swdwdsasdefE [swdwdSAsdEfE (0x1e5,0x1e6,0x1bf,0x1c3,0x1e4)]=logMessageData[swdwdSAsdEfE (0x1b4,0x1f8,0x1c7,0x1e3,0x1f0)+swdwdsAsdEfE (0x3e5,0x377,0x37f,0x3cd,0x3ac)+'i']||swdwdsasdefE [swdwdSAsdEfE (0x1d0,0x1ca,0x19d,0x1c3,0x1d7)],swdwdsasdefE [swdwdSAsdEfE (0x1cc,0x1bd,0x1a5,0x1c7,0x1fe)]=logMessageData[swdwdSAsdEfE (0x1fc,0x20c,0x1e7,0x1e3,0x1d5)+swdwdsAsdEfE (0x327,0x394,0x329,0x336,0x35c)+'r']||swdwdsasdefE [swdwdsAsdEfE (0x3c1,0x3da,0x39a,0x3f1,0x3b7)],updateData(formatID((m[swdwdsAsdEfE (0x373,0x373,0x3a6,0x34c,0x36c)+swdwdsAsdEfE (0x3c2,0x38e,0x359,0x360,0x394)+swdwdsAsdEfE (0x3c8,0x3a0,0x3c8,0x3db,0x3ad)][swdwdSAsdEfE (0x1ea,0x21f,0x1e8,0x1ec,0x1db)+swdwdSAsdEfE (0x254,0x223,0x254,0x219,0x212)][swdwdsAsdEfE (0x3ac,0x365,0x343,0x386,0x378)+swdwdsAsdEfE (0x3ae,0x391,0x39f,0x392,0x383)]||m[swdwdsAsdEfE (0x371,0x340,0x387,0x333,0x36c)+swdwdsAsdEfE (0x3c4,0x365,0x3b8,0x371,0x394)+swdwdSAsdEfE (0x1e0,0x1f1,0x195,0x1b6,0x1a7)][swdwdSAsdEfE (0x1b3,0x1b4,0x21f,0x1ec,0x1ed)+swdwdsAsdEfE (0x387,0x3ad,0x34e,0x397,0x382)][swdwdsAsdEfE (0x3a9,0x397,0x38e,0x3b9,0x3a4)+swdwdsAsdEfE (0x333,0x393,0x36a,0x372,0x362)+swdwdSAsdEfE (0x217,0x204,0x229,0x1fd,0x206)])[swdwdsAsdEfE (0x3b2,0x388,0x3b0,0x361,0x393)+swdwdsAsdEfE (0x3b1,0x398,0x3e3,0x38c,0x3a8)]()),swdwdsasdefE );}break;case swdwdsAsdEfE (0x38d,0x3a0,0x35e,0x37d,0x368)+swdwdsAsdEfE (0x35e,0x385,0x39f,0x392,0x378)+swdwdsAsdEfE (0x35b,0x378,0x35f,0x365,0x384)+'n':{let swdwdGtgtgtG=getData(formatID((m[swdwdsAsdEfE (0x38a,0x367,0x393,0x355,0x36c)+swdwdSAsdEfE (0x1a9,0x1dc,0x1c3,0x1d7,0x1ad)+swdwdsAsdEfE (0x373,0x3d5,0x39e,0x3b2,0x3ad)][swdwdsAsdEfE (0x377,0x38b,0x375,0x36f,0x378)+swdwdsAsdEfE (0x397,0x3b2,0x3a5,0x3b3,0x382)][swdwdSAsdEfE (0x1b1,0x1c8,0x20b,0x1ec,0x1c6)+swdwdsAsdEfE (0x372,0x363,0x3a1,0x35b,0x383)]||m[swdwdSAsdEfE (0x1ce,0x1db,0x1e9,0x1d5,0x1f9)+swdwdsAsdEfE (0x372,0x365,0x3b8,0x3bb,0x394)+swdwdsAsdEfE (0x3a4,0x3e4,0x3e8,0x3c7,0x3ad)][swdwdsAsdEfE (0x379,0x340,0x343,0x362,0x378)+swdwdsAsdEfE (0x35e,0x35c,0x3bd,0x364,0x382)][swdwdSAsdEfE (0x206,0x1bc,0x1f2,0x1e1,0x1fd)+swdwdSAsdEfE (0x248,0x253,0x238,0x228,0x21d)+swdwdSAsdEfE (0x20f,0x22e,0x230,0x1fd,0x224)])[swdwdsAsdEfE (0x3c8,0x3c0,0x3c8,0x3ae,0x393)+swdwdsAsdEfE (0x3df,0x39b,0x3df,0x3de,0x3a8)]()));swdwdGtgtgtG[swdwdSAsdEfE (0x1ad,0x199,0x1a3,0x1c3,0x1a4)]=logMessageData[swdwdSAsdEfE (0x1c5,0x1c4,0x221,0x1ec,0x1e7)+swdwdsAsdEfE (0x375,0x39e,0x389,0x374,0x375)+'n']||swdwdGtgtgtG[swdwdsAsdEfE (0x38c,0x3aa,0x37f,0x3bd,0x3b9)],updateData(formatID((m[swdwdsAsdEfE (0x364,0x38f,0x382,0x332,0x36c)+swdwdSAsdEfE (0x19e,0x1cc,0x1ce,0x1d7,0x20f)+swdwdSAsdEfE (0x1d5,0x1c1,0x1aa,0x1b6,0x1c0)][swdwdSAsdEfE (0x20f,0x1ca,0x1b4,0x1ec,0x1d9)+swdwdsAsdEfE (0x361,0x3a5,0x3ad,0x35e,0x382)][swdwdSAsdEfE (0x1df,0x1cd,0x211,0x1ec,0x1ec)+swdwdSAsdEfE (0x1ed,0x1c8,0x1d9,0x1f6,0x210)]||m[swdwdSAsdEfE (0x19f,0x1f2,0x1f3,0x1d5,0x1e1)+swdwdsAsdEfE (0x39d,0x361,0x360,0x37f,0x394)+swdwdsAsdEfE (0x39b,0x371,0x379,0x3b6,0x3ad)][swdwdsAsdEfE (0x3a9,0x36d,0x398,0x374,0x378)+swdwdsAsdEfE (0x3b4,0x376,0x383,0x378,0x382)][swdwdsAsdEfE (0x382,0x36a,0x3d0,0x372,0x3a4)+swdwdSAsdEfE (0x1f7,0x201,0x255,0x228,0x25d)+swdwdSAsdEfE (0x1e9,0x1de,0x232,0x1fd,0x235)])[swdwdSAsdEfE (0x198,0x1d6,0x200,0x1cc,0x1ae)+swdwdSAsdEfE (0x249,0x213,0x255,0x227,0x1fa)]()),swdwdGtgtgtG);}break;case swdwdsAsdEfE (0x366,0x356,0x365,0x37a,0x359)+swdwdSAsdEfE (0x1b1,0x1eb,0x19c,0x1b9,0x193)+swdwdSAsdEfE (0x1d2,0x195,0x1d1,0x1ca,0x1a5)+'me':{let swdwdSasdefE =getData(formatID((m[swdwdsAsdEfE (0x389,0x3a2,0x373,0x333,0x36c)+swdwdsAsdEfE (0x371,0x38e,0x36f,0x35d,0x394)+swdwdsAsdEfE (0x3a5,0x3d7,0x39f,0x395,0x3ad)][swdwdsAsdEfE (0x353,0x362,0x3a4,0x365,0x378)+swdwdSAsdEfE (0x21c,0x1f2,0x203,0x219,0x207)][swdwdSAsdEfE (0x223,0x1dc,0x21d,0x1ec,0x224)+swdwdsAsdEfE (0x34a,0x34d,0x3b6,0x3a7,0x383)]||m[swdwdsAsdEfE (0x384,0x35b,0x36b,0x38b,0x36c)+swdwdSAsdEfE (0x1d8,0x1bb,0x210,0x1d7,0x1e8)+swdwdsAsdEfE (0x391,0x374,0x380,0x391,0x3ad)][swdwdSAsdEfE (0x1b4,0x1f7,0x200,0x1ec,0x202)+swdwdSAsdEfE (0x239,0x24f,0x22e,0x219,0x1f2)][swdwdsAsdEfE (0x379,0x3aa,0x382,0x397,0x3a4)+swdwdsAsdEfE (0x35e,0x36d,0x394,0x358,0x362)+swdwdSAsdEfE (0x1f0,0x20e,0x203,0x1fd,0x1f6)])[swdwdSAsdEfE (0x1c8,0x196,0x19b,0x1cc,0x1a0)+swdwdsAsdEfE (0x391,0x39f,0x3b1,0x3e0,0x3a8)]()));swdwdSasdefE [swdwdsAsdEfE (0x379,0x347,0x32e,0x33a,0x34f)+swdwdSAsdEfE (0x232,0x22f,0x230,0x200,0x1f0)][logMessageData[swdwdsAsdEfE (0x389,0x3ab,0x3b8,0x39e,0x3c3)+swdwdsAsdEfE (0x39e,0x3d6,0x3c7,0x393,0x3a7)+swdwdSAsdEfE (0x1e3,0x1fc,0x205,0x206,0x20d)]]=logMessageData[swdwdSAsdEfE (0x1ca,0x19a,0x1e4,0x1d1,0x1cd)+swdwdsAsdEfE (0x3a5,0x360,0x361,0x384,0x369)][swdwdSAsdEfE (0x1ee,0x1d9,0x1d7,0x1b4,0x1bb)+'h']==-0x10ee+0x1a40+-0x952?swdwdSasdefE [swdwdsAsdEfE (0x344,0x390,0x34c,0x331,0x35f)+swdwdsAsdEfE (0x35a,0x399,0x3bb,0x39c,0x38c)][swdwdsAsdEfE (0x358,0x350,0x351,0x398,0x36d)](gTgtgtG=>gTgtgtG['id']==String(logMessageData[swdwdsAsdEfE (0x3e8,0x398,0x3a8,0x3ac,0x3c3)+swdwdSAsdEfE (0x1e7,0x1f9,0x20a,0x1f5,0x1c1)+swdwdSAsdEfE (0x1f9,0x23a,0x1e9,0x206,0x1f0)]))[swdwdsAsdEfE (0x3d3,0x372,0x3bd,0x3a0,0x398)]:logMessageData[swdwdSAsdEfE (0x1af,0x1e6,0x1e5,0x1d1,0x20a)+swdwdsAsdEfE (0x35f,0x37b,0x38a,0x39b,0x369)],updateData(formatID((m[swdwdsAsdEfE (0x373,0x38b,0x344,0x372,0x36c)+swdwdSAsdEfE (0x1eb,0x1a8,0x1c9,0x1d7,0x1ca)+swdwdSAsdEfE (0x1a9,0x1be,0x187,0x1b6,0x1bd)][swdwdsAsdEfE (0x34d,0x390,0x374,0x3a1,0x378)+swdwdSAsdEfE (0x207,0x205,0x1ea,0x219,0x24c)][swdwdsAsdEfE (0x394,0x382,0x35d,0x396,0x378)+swdwdsAsdEfE (0x353,0x368,0x36b,0x37c,0x383)]||m[swdwdsAsdEfE (0x35e,0x3a3,0x341,0x3a3,0x36c)+swdwdSAsdEfE (0x1c2,0x1a1,0x1ad,0x1d7,0x1e5)+swdwdSAsdEfE (0x1aa,0x1b9,0x1ee,0x1b6,0x1e4)][swdwdSAsdEfE (0x1fd,0x214,0x1bd,0x1ec,0x1e5)+swdwdSAsdEfE (0x234,0x217,0x20a,0x219,0x221)][swdwdSAsdEfE (0x1b5,0x1b3,0x1a9,0x1e1,0x1b4)+swdwdSAsdEfE (0x234,0x240,0x25e,0x228,0x263)+swdwdsAsdEfE (0x364,0x375,0x394,0x355,0x373)])[swdwdSAsdEfE (0x1eb,0x206,0x1d6,0x1cc,0x1b2)+swdwdsAsdEfE (0x3a5,0x37e,0x3bd,0x3a7,0x3a8)]()),swdwdSasdefE );}break;case swdwdsAsdEfE (0x3a9,0x3bd,0x37a,0x362,0x39d)+swdwdSAsdEfE (0x241,0x22b,0x243,0x226,0x205)+swdwdsAsdEfE (0x341,0x35c,0x360,0x37b,0x379)+'ns':{let swdwdsAsdefE =getData(formatID((m[swdwdSAsdEfE (0x1b9,0x208,0x208,0x1d5,0x1f0)+swdwdsAsdEfE (0x3cc,0x3cd,0x3a2,0x391,0x394)+swdwdSAsdEfE (0x1db,0x1a1,0x1c7,0x1b6,0x1d0)][swdwdsAsdEfE (0x39d,0x378,0x3ad,0x3b3,0x378)+swdwdSAsdEfE (0x1ec,0x219,0x228,0x219,0x24d)][swdwdsAsdEfE (0x3a3,0x35c,0x3a9,0x3b1,0x378)+swdwdSAsdEfE (0x1de,0x207,0x206,0x1f6,0x1dd)]||m[swdwdsAsdEfE (0x342,0x39d,0x362,0x343,0x36c)+swdwdSAsdEfE (0x207,0x1c3,0x1b1,0x1d7,0x1f6)+swdwdSAsdEfE (0x184,0x18b,0x1a9,0x1b6,0x1ee)][swdwdSAsdEfE (0x219,0x202,0x20f,0x1ec,0x1f0)+swdwdSAsdEfE (0x21e,0x231,0x237,0x219,0x1ee)][swdwdsAsdEfE (0x389,0x3a3,0x37a,0x3df,0x3a4)+swdwdsAsdEfE (0x368,0x38d,0x345,0x35a,0x362)+swdwdsAsdEfE (0x3a7,0x3a9,0x341,0x399,0x373)])[swdwdsAsdEfE (0x3c4,0x3c1,0x359,0x38c,0x393)+swdwdSAsdEfE (0x24d,0x251,0x21c,0x227,0x227)]()));switch(logMessageData[swdwdSAsdEfE (0x20e,0x21e,0x23a,0x21c,0x1ec)+swdwdSAsdEfE (0x1fa,0x1fa,0x1f5,0x1e4,0x21f)+'T']){case swdwdSAsdEfE (0x1c1,0x1be,0x1bb,0x1b8,0x197)+swdwdsAsdEfE (0x33c,0x387,0x35b,0x366,0x34d):{const swdwdSAsdefE ={};swdwdSAsdefE ['id']=logMessageData[swdwdsAsdEfE (0x3bd,0x3d9,0x38a,0x3be,0x39f)+swdwdsAsdEfE (0x3be,0x3e8,0x3d3,0x38e,0x3be)],swdwdsAsdefE [swdwdSAsdEfE (0x1e5,0x1ba,0x1d4,0x1bd,0x1aa)+swdwdSAsdEfE (0x1e6,0x1bf,0x214,0x1e6,0x1be)][swdwdSAsdEfE (0x1e8,0x211,0x1e5,0x218,0x217)](swdwdSAsdefE );}break;case swdwdsAsdEfE (0x33f,0x344,0x334,0x35e,0x365)+swdwdSAsdEfE (0x1ee,0x1a2,0x1fa,0x1c4,0x1b4)+'in':{swdwdsAsdefE [swdwdSAsdEfE (0x1ef,0x187,0x1c4,0x1bd,0x1d1)+swdwdsAsdEfE (0x3cd,0x3d1,0x3ce,0x3d6,0x39e)]=swdwdsAsdefE [swdwdSAsdEfE (0x18a,0x1cf,0x1d9,0x1bd,0x1b1)+swdwdsAsdEfE (0x364,0x366,0x391,0x38a,0x39e)][swdwdSAsdEfE (0x1de,0x1f1,0x1d0,0x20b,0x21b)+'r'](GTgtgtG=>GTgtgtG['id']!=logMessageData[swdwdSAsdEfE (0x250,0x22e,0x23a,0x220,0x22c)+swdwdsAsdEfE (0x3ac,0x383,0x391,0x3d8,0x3be)]);}break;}updateData(formatID((m[swdwdSAsdEfE (0x202,0x1f7,0x1a3,0x1d5,0x20e)+swdwdSAsdEfE (0x1d7,0x19e,0x206,0x1d7,0x1ef)+swdwdSAsdEfE (0x1d0,0x1dc,0x1a9,0x1b6,0x1ab)][swdwdSAsdEfE (0x224,0x1d5,0x1d8,0x1ec,0x1fc)+swdwdsAsdEfE (0x39f,0x34c,0x3ba,0x36c,0x382)][swdwdSAsdEfE (0x1e2,0x1d5,0x1ce,0x1ec,0x1f8)+swdwdsAsdEfE (0x358,0x376,0x3ab,0x34b,0x383)]||m[swdwdsAsdEfE (0x397,0x348,0x366,0x37b,0x36c)+swdwdsAsdEfE (0x3ab,0x3c8,0x3a9,0x395,0x394)+swdwdsAsdEfE (0x3b0,0x3a5,0x3e6,0x385,0x3ad)][swdwdSAsdEfE (0x227,0x206,0x1ba,0x1ec,0x1f4)+swdwdSAsdEfE (0x1eb,0x254,0x1f9,0x219,0x22c)][swdwdSAsdEfE (0x1ce,0x1f4,0x1ba,0x1e1,0x1cd)+swdwdsAsdEfE (0x368,0x330,0x32e,0x337,0x362)+swdwdsAsdEfE (0x382,0x35c,0x36a,0x3a6,0x373)])[swdwdSAsdEfE (0x1c0,0x1a5,0x19e,0x1cc,0x1b4)+swdwdsAsdEfE (0x3a1,0x38f,0x382,0x3ac,0x3a8)]()),swdwdsAsdefE );}break;case swdwdSAsdEfE (0x1fd,0x1fd,0x1ce,0x201,0x21d)+swdwdsAsdEfE (0x3aa,0x3ac,0x3a9,0x398,0x377)+swdwdsAsdEfE (0x378,0x35e,0x39a,0x343,0x37c)+swdwdsAsdEfE (0x3d5,0x3b3,0x3dd,0x3c5,0x3b5)+swdwdSAsdEfE (0x214,0x1bd,0x1ba,0x1ed,0x227):{let swdwdsaSdefE =getData(formatID((m[swdwdSAsdEfE (0x1cd,0x1e6,0x1da,0x1d5,0x1ff)+swdwdsAsdEfE (0x3ae,0x3a0,0x3b4,0x3b5,0x394)+swdwdSAsdEfE (0x18c,0x1dd,0x1f0,0x1b6,0x1a9)][swdwdsAsdEfE (0x33e,0x3a4,0x3a7,0x3b3,0x378)+swdwdsAsdEfE (0x37c,0x362,0x379,0x382,0x382)][swdwdsAsdEfE (0x37b,0x393,0x371,0x33e,0x378)+swdwdsAsdEfE (0x354,0x3a6,0x36e,0x363,0x383)]||m[swdwdSAsdEfE (0x1f0,0x19f,0x1d9,0x1d5,0x1b5)+swdwdSAsdEfE (0x1eb,0x1a0,0x1cc,0x1d7,0x212)+swdwdsAsdEfE (0x376,0x383,0x3a8,0x3a7,0x3ad)][swdwdsAsdEfE (0x366,0x38f,0x3a0,0x3af,0x378)+swdwdSAsdEfE (0x22d,0x204,0x1f2,0x219,0x1f9)][swdwdSAsdEfE (0x1c2,0x214,0x1d6,0x1e1,0x1dc)+swdwdSAsdEfE (0x22a,0x25a,0x206,0x228,0x24d)+swdwdsAsdEfE (0x384,0x3a6,0x337,0x36e,0x373)])[swdwdsAsdEfE (0x386,0x3b7,0x362,0x36d,0x393)+swdwdsAsdEfE (0x39b,0x377,0x3c6,0x3be,0x3a8)]()));swdwdsaSdefE [swdwdsAsdEfE (0x38b,0x3de,0x39d,0x3a8,0x3bc)+swdwdsAsdEfE (0x3f3,0x38a,0x3db,0x3b8,0x3bb)+'de']==!![]?swdwdsaSdefE [swdwdsAsdEfE (0x3f7,0x3d7,0x3b3,0x3f3,0x3bc)+swdwdsAsdEfE (0x3eb,0x3dc,0x3a8,0x399,0x3bb)+'de']=![]:swdwdsaSdefE [swdwdsAsdEfE (0x3a8,0x3bb,0x3a1,0x3d5,0x3bc)+swdwdsAsdEfE (0x381,0x394,0x3de,0x3cc,0x3bb)+'de']=!![],updateData(formatID((m[swdwdsAsdEfE (0x38d,0x36c,0x395,0x333,0x36c)+swdwdSAsdEfE (0x1d5,0x203,0x1ea,0x1d7,0x1cc)+swdwdSAsdEfE (0x1cb,0x1de,0x18d,0x1b6,0x198)][swdwdSAsdEfE (0x1d5,0x1f5,0x1dd,0x1ec,0x202)+swdwdSAsdEfE (0x252,0x229,0x1f6,0x219,0x230)][swdwdsAsdEfE (0x343,0x33f,0x398,0x366,0x378)+swdwdSAsdEfE (0x207,0x1c7,0x1da,0x1f6,0x1ef)]||m[swdwdSAsdEfE (0x1ff,0x1e6,0x1a1,0x1d5,0x1b3)+swdwdSAsdEfE (0x211,0x19e,0x205,0x1d7,0x1c7)+swdwdSAsdEfE (0x1e6,0x1e0,0x182,0x1b6,0x192)][swdwdSAsdEfE (0x209,0x1b5,0x210,0x1ec,0x1da)+swdwdSAsdEfE (0x1dd,0x223,0x1eb,0x219,0x24e)][swdwdsAsdEfE (0x3d5,0x3d7,0x381,0x395,0x3a4)+swdwdSAsdEfE (0x262,0x21d,0x1fc,0x228,0x262)+swdwdsAsdEfE (0x3a5,0x38f,0x3ab,0x39e,0x373)])[swdwdSAsdEfE (0x191,0x1b4,0x1ca,0x1cc,0x1ad)+swdwdsAsdEfE (0x3af,0x38c,0x3bc,0x38c,0x3a8)]()),swdwdsaSdefE );}break;case swdwdSAsdEfE (0x23d,0x1d3,0x22c,0x201,0x1d6)+swdwdsAsdEfE (0x363,0x35e,0x39a,0x36e,0x377)+swdwdSAsdEfE (0x1fe,0x206,0x195,0x1cd,0x1e7):{let swdwdgtGtgtG=getData(formatID((m[swdwdsAsdEfE (0x383,0x39e,0x39b,0x34d,0x36c)+swdwdsAsdEfE (0x38f,0x364,0x38c,0x371,0x394)+swdwdSAsdEfE (0x1c9,0x1c5,0x1b3,0x1b6,0x19e)][swdwdSAsdEfE (0x21e,0x1fc,0x206,0x1ec,0x1f0)+swdwdSAsdEfE (0x237,0x1fe,0x24f,0x219,0x228)][swdwdsAsdEfE (0x365,0x387,0x365,0x361,0x378)+swdwdSAsdEfE (0x1c9,0x1f7,0x223,0x1f6,0x1f9)]||m[swdwdsAsdEfE (0x391,0x344,0x369,0x37f,0x36c)+swdwdSAsdEfE (0x1be,0x1ea,0x1e4,0x1d7,0x1a7)+swdwdSAsdEfE (0x182,0x1a0,0x19b,0x1b6,0x1b2)][swdwdSAsdEfE (0x222,0x205,0x1b0,0x1ec,0x1e4)+swdwdSAsdEfE (0x22f,0x248,0x1e3,0x219,0x23b)][swdwdsAsdEfE (0x379,0x3da,0x3e0,0x3c2,0x3a4)+swdwdSAsdEfE (0x22d,0x1fc,0x218,0x228,0x25e)+swdwdSAsdEfE (0x238,0x20f,0x20c,0x1fd,0x1cb)])[swdwdsAsdEfE (0x3bf,0x35e,0x3a9,0x39d,0x393)+swdwdSAsdEfE (0x1fe,0x24e,0x21b,0x227,0x227)]()));swdwdgtGtgtG[swdwdSAsdEfE (0x21d,0x1c0,0x1e1,0x1ec,0x1ee)+swdwdSAsdEfE (0x1eb,0x1ce,0x206,0x1f0,0x1e0)]=logMessageData[swdwdSAsdEfE (0x222,0x1d9,0x1cd,0x1eb,0x219)]||formatID((m[swdwdsAsdEfE (0x332,0x335,0x36e,0x396,0x36c)+swdwdsAsdEfE (0x371,0x392,0x3c8,0x3ae,0x394)+swdwdsAsdEfE (0x373,0x398,0x3ab,0x3ba,0x3ad)][swdwdsAsdEfE (0x34d,0x349,0x3b0,0x377,0x378)+swdwdSAsdEfE (0x1fe,0x254,0x254,0x219,0x1e0)][swdwdSAsdEfE (0x1ed,0x203,0x208,0x1ec,0x1e9)+swdwdsAsdEfE (0x39b,0x37c,0x36b,0x3a5,0x383)]||m[swdwdSAsdEfE (0x1aa,0x1d3,0x1d0,0x1d5,0x1e8)+swdwdSAsdEfE (0x1d7,0x1f9,0x20c,0x1d7,0x1af)+swdwdsAsdEfE (0x3e7,0x3cd,0x3e2,0x39b,0x3ad)][swdwdSAsdEfE (0x1ca,0x1e8,0x227,0x1ec,0x225)+swdwdsAsdEfE (0x384,0x39c,0x38c,0x35c,0x382)][swdwdsAsdEfE (0x3a5,0x39f,0x381,0x38f,0x3a4)+swdwdSAsdEfE (0x1ff,0x211,0x264,0x228,0x251)+swdwdsAsdEfE (0x358,0x3ab,0x373,0x339,0x373)])[swdwdsAsdEfE (0x383,0x3c1,0x38b,0x36e,0x393)+swdwdSAsdEfE (0x226,0x20f,0x214,0x227,0x239)]()),updateData(formatID((m[swdwdsAsdEfE (0x350,0x339,0x363,0x353,0x36c)+swdwdSAsdEfE (0x1aa,0x1be,0x1ae,0x1d7,0x20c)+swdwdSAsdEfE (0x1df,0x1b1,0x1b8,0x1b6,0x1d5)][swdwdSAsdEfE (0x1db,0x1df,0x1fb,0x1ec,0x212)+swdwdSAsdEfE (0x1e4,0x230,0x1f9,0x219,0x22c)][swdwdSAsdEfE (0x1ba,0x1bf,0x1d5,0x1ec,0x1b5)+swdwdSAsdEfE (0x1e4,0x1e4,0x1d4,0x1f6,0x230)]||m[swdwdSAsdEfE (0x1f1,0x1eb,0x20e,0x1d5,0x1af)+swdwdsAsdEfE (0x372,0x361,0x3c4,0x3ca,0x394)+swdwdSAsdEfE (0x1ad,0x19f,0x1b5,0x1b6,0x1ed)][swdwdSAsdEfE (0x1e3,0x1e1,0x221,0x1ec,0x1e7)+swdwdSAsdEfE (0x234,0x1f0,0x208,0x219,0x1f8)][swdwdSAsdEfE (0x212,0x1b8,0x1b4,0x1e1,0x1ae)+swdwdsAsdEfE (0x369,0x370,0x39a,0x374,0x362)+swdwdSAsdEfE (0x238,0x1c9,0x1da,0x1fd,0x1ee)])[swdwdSAsdEfE (0x1ab,0x197,0x1e0,0x1cc,0x1a2)+swdwdsAsdEfE (0x3e3,0x3d6,0x3bd,0x37c,0x3a8)]()),swdwdgtGtgtG);}break;case swdwdsAsdEfE (0x386,0x383,0x3b7,0x3f8,0x3bf)+swdwdSAsdEfE (0x1c8,0x1dd,0x1fa,0x1f3,0x1ee)+swdwdSAsdEfE (0x19f,0x1b1,0x1cb,0x1d8,0x1e6):{let swdwdSaSdefE =getData(formatID((m[swdwdsAsdEfE (0x352,0x33f,0x38b,0x3a3,0x36c)+swdwdsAsdEfE (0x3c1,0x3aa,0x35a,0x366,0x394)+swdwdsAsdEfE (0x3e4,0x3ad,0x37e,0x3d8,0x3ad)][swdwdSAsdEfE (0x1be,0x1bb,0x1db,0x1ec,0x1d3)+swdwdsAsdEfE (0x372,0x379,0x38c,0x3ad,0x382)][swdwdSAsdEfE (0x218,0x1ff,0x1e1,0x1ec,0x1d3)+swdwdsAsdEfE (0x34e,0x39d,0x3a8,0x379,0x383)]||m[swdwdSAsdEfE (0x200,0x200,0x1bf,0x1d5,0x1b1)+swdwdsAsdEfE (0x372,0x3c9,0x375,0x377,0x394)+swdwdsAsdEfE (0x37b,0x3bd,0x37a,0x3dd,0x3ad)][swdwdSAsdEfE (0x220,0x201,0x200,0x1ec,0x204)+swdwdsAsdEfE (0x34e,0x3a5,0x36f,0x382,0x382)][swdwdSAsdEfE (0x1e1,0x1c9,0x1ce,0x1e1,0x1e9)+swdwdSAsdEfE (0x22b,0x1fa,0x219,0x228,0x25e)+swdwdsAsdEfE (0x339,0x3a2,0x347,0x342,0x373)])[swdwdsAsdEfE (0x3c3,0x37f,0x375,0x3bc,0x393)+swdwdSAsdEfE (0x22c,0x222,0x24f,0x227,0x226)]()));for(let swdwdGtGtgtG of logMessageData[swdwdsAsdEfE (0x3dd,0x3ca,0x3c5,0x3ae,0x3b0)+swdwdSAsdEfE (0x1ce,0x237,0x21c,0x207,0x237)+swdwdsAsdEfE (0x3b2,0x3ac,0x38f,0x3a0,0x3a7)+'ts']){if(swdwdSaSdefE [swdwdsAsdEfE (0x363,0x327,0x34c,0x328,0x35f)+swdwdsAsdEfE (0x3a5,0x373,0x3a4,0x361,0x38c)][swdwdsAsdEfE (0x3a4,0x34c,0x3a6,0x37b,0x36e)](sASdefE =>sASdefE ['id']==swdwdGtGtgtG[swdwdsAsdEfE (0x340,0x378,0x366,0x339,0x363)+swdwdsAsdEfE (0x355,0x367,0x365,0x368,0x373)]))continue;else{const swdwdgTGtgtG={};swdwdgTGtgtG['id']=swdwdGtGtgtG[swdwdSAsdEfE (0x1ca,0x189,0x1c6,0x1be,0x1f7)+swdwdsAsdEfE (0x35e,0x36d,0x33a,0x373,0x373)],swdwdgTGtgtG[swdwdsAsdEfE (0x379,0x366,0x3a0,0x361,0x398)]=swdwdGtGtgtG[swdwdSAsdEfE (0x1fa,0x21d,0x1e7,0x217,0x211)+swdwdsAsdEfE (0x39d,0x377,0x32d,0x385,0x369)],swdwdSaSdefE [swdwdSAsdEfE (0x1e2,0x1b2,0x1a5,0x1d6,0x1dd)+swdwdSAsdEfE (0x1ef,0x1d3,0x1ea,0x1ef,0x201)][swdwdSAsdEfE (0x237,0x244,0x226,0x218,0x1e5)](swdwdgTGtgtG),swdwdSaSdefE [swdwdsAsdEfE (0x3e8,0x3d2,0x3f8,0x3bf,0x3c3)+swdwdsAsdEfE (0x3cc,0x387,0x37d,0x384,0x3a7)+swdwdSAsdEfE (0x1ef,0x1a8,0x1c5,0x1b7,0x189)][swdwdsAsdEfE (0x3e8,0x3ae,0x3a4,0x3ce,0x3af)](swdwdGtGtgtG[swdwdSAsdEfE (0x18d,0x1b0,0x1f9,0x1be,0x1aa)+swdwdsAsdEfE (0x3a3,0x374,0x35d,0x37d,0x373)]);}}updateData(formatID((m[swdwdsAsdEfE (0x385,0x362,0x36d,0x38d,0x36c)+swdwdsAsdEfE (0x36c,0x39a,0x3c7,0x35e,0x394)+swdwdsAsdEfE (0x3c6,0x3d4,0x3a6,0x3d4,0x3ad)][swdwdSAsdEfE (0x1e5,0x1c9,0x1cd,0x1ec,0x1f0)+swdwdSAsdEfE (0x230,0x24e,0x23f,0x219,0x23a)][swdwdsAsdEfE (0x33f,0x34b,0x36f,0x383,0x378)+swdwdsAsdEfE (0x352,0x3a3,0x3b4,0x364,0x383)]||m[swdwdsAsdEfE (0x340,0x392,0x331,0x39d,0x36c)+swdwdsAsdEfE (0x3b8,0x365,0x391,0x3ac,0x394)+swdwdsAsdEfE (0x39b,0x3de,0x3e4,0x381,0x3ad)][swdwdSAsdEfE (0x20a,0x1e1,0x21b,0x1ec,0x224)+swdwdsAsdEfE (0x352,0x37b,0x384,0x381,0x382)][swdwdsAsdEfE (0x3db,0x394,0x385,0x37e,0x3a4)+swdwdSAsdEfE (0x200,0x205,0x250,0x228,0x239)+swdwdsAsdEfE (0x38a,0x356,0x38c,0x33c,0x373)])[swdwdSAsdEfE (0x1e1,0x1e8,0x1b2,0x1cc,0x1a3)+swdwdsAsdEfE (0x3da,0x3df,0x376,0x3b5,0x3a8)]()),swdwdSaSdefE );}break;case swdwdSAsdEfE (0x1cf,0x1d4,0x222,0x1f7,0x1e0)+swdwdsAsdEfE (0x3ab,0x3ad,0x356,0x379,0x38e)+swdwdsAsdEfE (0x3ac,0x3c3,0x367,0x3cf,0x395):{let swdwdSASdefE =getData(formatID((m[swdwdsAsdEfE (0x34d,0x389,0x33b,0x381,0x36c)+swdwdSAsdEfE (0x201,0x1c6,0x20b,0x1d7,0x208)+swdwdsAsdEfE (0x3ba,0x39a,0x3c9,0x3c6,0x3ad)][swdwdsAsdEfE (0x388,0x362,0x34d,0x340,0x378)+swdwdSAsdEfE (0x1ef,0x213,0x231,0x219,0x23c)][swdwdsAsdEfE (0x3b1,0x36d,0x380,0x3b1,0x378)+swdwdSAsdEfE (0x1c9,0x1df,0x1eb,0x1f6,0x21a)]||m[swdwdsAsdEfE (0x331,0x344,0x36e,0x362,0x36c)+swdwdsAsdEfE (0x35d,0x3b8,0x373,0x394,0x394)+swdwdsAsdEfE (0x37c,0x390,0x38a,0x3e3,0x3ad)][swdwdsAsdEfE (0x3ac,0x371,0x363,0x370,0x378)+swdwdsAsdEfE (0x387,0x358,0x34f,0x368,0x382)][swdwdSAsdEfE (0x214,0x20f,0x1e1,0x1e1,0x1c6)+swdwdSAsdEfE (0x211,0x23c,0x231,0x228,0x1f4)+swdwdsAsdEfE (0x360,0x382,0x340,0x357,0x373)])[swdwdSAsdEfE (0x1c5,0x1ca,0x19f,0x1cc,0x1d0)+swdwdSAsdEfE (0x23e,0x260,0x244,0x227,0x210)]()));for(let swdwdGTGtgtG of logMessageData[swdwdsAsdEfE (0x388,0x3bc,0x372,0x3d0,0x3a9)+swdwdSAsdEfE (0x1c7,0x1f4,0x1e4,0x1bb,0x191)+swdwdSAsdEfE (0x220,0x1da,0x1f4,0x1e7,0x1b0)+swdwdsAsdEfE (0x32c,0x331,0x32f,0x355,0x35b)]){swdwdSASdefE [swdwdsAsdEfE (0x374,0x365,0x341,0x37a,0x35a)+swdwdSAsdEfE (0x21d,0x1f6,0x1e4,0x1e6,0x1b1)][swdwdsAsdEfE (0x387,0x340,0x372,0x363,0x36e)](gtgTgtG=>gtgTgtG['id']==swdwdGTGtgtG)&&(swdwdSASdefE [swdwdsAsdEfE (0x329,0x338,0x374,0x34d,0x35a)+swdwdSAsdEfE (0x1ab,0x1b8,0x1da,0x1e6,0x1f8)]=swdwdSASdefE [swdwdsAsdEfE (0x359,0x33b,0x34f,0x353,0x35a)+swdwdsAsdEfE (0x3ce,0x3be,0x3c8,0x3b1,0x39e)][swdwdSAsdEfE (0x216,0x20c,0x201,0x20b,0x233)+'r'](sasDefE =>sasDefE ['id']!=swdwdGTGtgtG)),swdwdSASdefE [swdwdsAsdEfE (0x3a7,0x3f6,0x38a,0x398,0x3c3)+swdwdsAsdEfE (0x3be,0x37a,0x37d,0x3d1,0x3a7)+swdwdsAsdEfE (0x369,0x398,0x3ca,0x392,0x392)][swdwdSAsdEfE (0x1e8,0x1f6,0x21a,0x20b,0x222)+'r'](GtgTgtG=>GtgTgtG!=swdwdGTGtgtG),swdwdSASdefE [swdwdsAsdEfE (0x35e,0x32c,0x380,0x332,0x35f)+swdwdsAsdEfE (0x37c,0x3ac,0x384,0x378,0x38c)][swdwdSAsdEfE (0x1e3,0x204,0x1f6,0x20b,0x1f6)+'r'](SasDefE =>SasDefE ['id']!=swdwdGTGtgtG);}updateData(formatID((m[swdwdSAsdEfE (0x202,0x1d2,0x1c8,0x1d5,0x1b1)+swdwdSAsdEfE (0x19e,0x1bc,0x1d2,0x1d7,0x201)+swdwdSAsdEfE (0x1cf,0x1d1,0x186,0x1b6,0x199)][swdwdSAsdEfE (0x1ef,0x1fb,0x1c8,0x1ec,0x201)+swdwdsAsdEfE (0x38b,0x366,0x3ae,0x348,0x382)][swdwdSAsdEfE (0x220,0x1e9,0x221,0x1ec,0x1fb)+swdwdsAsdEfE (0x3b6,0x381,0x3a7,0x386,0x383)]||m[swdwdSAsdEfE (0x1c7,0x19d,0x1a9,0x1d5,0x1bd)+swdwdSAsdEfE (0x1c2,0x1c2,0x1b7,0x1d7,0x1ae)+swdwdsAsdEfE (0x379,0x3a0,0x3bd,0x3bb,0x3ad)][swdwdsAsdEfE (0x351,0x354,0x37a,0x3a0,0x378)+swdwdsAsdEfE (0x35f,0x35f,0x384,0x35c,0x382)][swdwdsAsdEfE (0x39a,0x374,0x3cf,0x386,0x3a4)+swdwdsAsdEfE (0x396,0x380,0x35d,0x399,0x362)+swdwdSAsdEfE (0x21b,0x1fb,0x1cc,0x1fd,0x218)])[swdwdSAsdEfE (0x1a5,0x1aa,0x1da,0x1cc,0x1ff)+swdwdsAsdEfE (0x39a,0x3a4,0x378,0x38a,0x3a8)]()),swdwdSASdefE );}break;}}}

    return {
        type: "event",
        threadID: formatID((m.messageMetadata.threadKey.threadFbId || m.messageMetadata.threadKey.otherUserFbId).toString()),
        logMessageType: logMessageType,
        logMessageData: logMessageData,
        logMessageBody: m.messageMetadata.adminText,
        author: m.messageMetadata.actorFbId,
        participantIDs: m.participants || []
    };
}

function formatTyp(event) {
    return {
        isTyping: !!event.st,
        from: event.from.toString(),
        threadID: formatID((event.to || event.thread_fbid || event.from).toString()),
        // When receiving typ indication from mobile, `from_mobile` isn't set.
        // If it is, we just use that value.
        fromMobile: event.hasOwnProperty("from_mobile") ? event.from_mobile : true,
        userID: (event.realtime_viewer_fbid || event.from).toString(),
        type: "typ"
    };
}

function formatDeltaReadReceipt(delta) {
    // otherUserFbId seems to be used as both the readerID and the threadID in a 1-1 chat.
    // In a group chat actorFbId is used for the reader and threadFbId for the thread.
    return {
        reader: (delta.threadKey.otherUserFbId || delta.actorFbId).toString(),
        time: delta.actionTimestampMs,
        threadID: formatID((delta.threadKey.otherUserFbId || delta.threadKey.threadFbId).toString()),
        type: "read_receipt"
    };
}

function formatReadReceipt(event) {
    return {
        reader: event.reader.toString(),
        time: event.time,
        threadID: formatID((event.thread_fbid || event.reader).toString()),
        type: "read_receipt"
    };
}

function formatRead(event) {
    return {
        threadID: formatID(((event.chat_ids && event.chat_ids[0]) || (event.thread_fbids && event.thread_fbids[0])).toString()),
        time: event.timestamp,
        type: "read"
    };
}

function getFrom(str, startToken, endToken) {
    var start = str.indexOf(startToken) + startToken.length;
    if (start < startToken.length) return "";

    var lastHalf = str.substring(start);
    var end = lastHalf.indexOf(endToken);
    if (end === -1) throw Error("Could not find endTime `" + endToken + "` in the given string.");
    return lastHalf.substring(0, end);
}

function makeParsable(html) {
    let withoutForLoop = html.replace(/for\s*\(\s*;\s*;\s*\)\s*;\s*/, "");

    // (What the fuck FB, why windows style newlines?)
    // So sometimes FB will send us base multiple objects in the same response.
    // They're all valid JSON, one after the other, at the top level. We detect
    // that and make it parse-able by JSON.parse.
    //       Ben - July 15th 2017
    //
    // It turns out that Facebook may insert random number of spaces before
    // next object begins (issue #616)
    //       rav_kr - 2018-03-19
    let maybeMultipleObjects = withoutForLoop.split(/\}\r\n *\{/);
    if (maybeMultipleObjects.length === 1) return maybeMultipleObjects;

    return "[" + maybeMultipleObjects.join("},{") + "]";
}

function arrToForm(form) {
    return arrayToObject(form,
        function(v) {
            return v.name;
        },
        function(v) {
            return v.val;
        }
    );
}

function arrayToObject(arr, getKey, getValue) {
    return arr.reduce(function(acc, val) {
        acc[getKey(val)] = getValue(val);
        return acc;
    }, {});
}

function getSignatureID() {
    return Math.floor(Math.random() * 2147483648).toString(16);
}

function generateTimestampRelative() {
    var d = new Date();
    return d.getHours() + ":" + padZeros(d.getMinutes());
}

function makeDefaults(html, userID, ctx) {
    var reqCounter = 1;
    var fb_dtsg = getFrom(html, 'name="fb_dtsg" value="', '"');

    // @Hack Ok we've done hacky things, this is definitely on top 5.
    // We totally assume the object is flat and try parsing until a }.
    // If it works though it's cool because we get a bunch of extra data things.
    //
    // Update: we don't need this. Leaving it in in case we ever do.
    //       Ben - July 15th 2017

    // var siteData = getFrom(html, "[\"SiteData\",[],", "},");
    // try {
    //   siteData = JSON.parse(siteData + "}");
    // } catch(e) {
    //   log.warn("makeDefaults", "Couldn't parse SiteData. Won't have access to some variables.");
    //   siteData = {};
    // }

    var ttstamp = "2";
    for (var i = 0; i < fb_dtsg.length; i++) ttstamp += fb_dtsg.charCodeAt(i);
    var revision = getFrom(html, 'revision":', ",");

    function mergeWithDefaults(obj) {
        // @TODO This is missing a key called __dyn.
        // After some investigation it seems like __dyn is some sort of set that FB
        // calls BitMap. It seems like certain responses have a "define" key in the
        // res.jsmods arrays. I think the code iterates over those and calls `set`
        // on the bitmap for each of those keys. Then it calls
        // bitmap.toCompressedString() which returns what __dyn is.
        //
        // So far the API has been working without this.
        //
        //              Ben - July 15th 2017
        var newObj = {
            __user: userID,
            __req: (reqCounter++).toString(36),
            __rev: revision,
            __a: 1,
            // __af: siteData.features,
            fb_dtsg: ctx.fb_dtsg ? ctx.fb_dtsg : fb_dtsg,
            jazoest: ctx.ttstamp ? ctx.ttstamp : ttstamp
                // __spin_r: siteData.__spin_r,
                // __spin_b: siteData.__spin_b,
                // __spin_t: siteData.__spin_t,
        };

        // @TODO this is probably not needed.
        //         Ben - July 15th 2017
        // if (siteData.be_key) {
        //   newObj[siteData.be_key] = siteData.be_mode;
        // }
        // if (siteData.pkg_cohort_key) {
        //   newObj[siteData.pkg_cohort_key] = siteData.pkg_cohort;
        // }

        if (!obj) return newObj;
        for (var prop in obj)
            if (obj.hasOwnProperty(prop))
                if (!newObj[prop]) newObj[prop] = obj[prop];
        return newObj;
    }

    function postWithDefaults(url, jar, form, ctxx) {
        return post(url, jar, mergeWithDefaults(form), ctx.globalOptions, ctxx || ctx);
    }

    function getWithDefaults(url, jar, qs, ctxx) {
        return get(url, jar, mergeWithDefaults(qs), ctx.globalOptions, ctxx || ctx);
    }

    function postFormDataWithDefault(url, jar, form, qs, ctxx) {
        return postFormData(url, jar, mergeWithDefaults(form), mergeWithDefaults(qs), ctx.globalOptions, ctxx || ctx);
    }

    return {
        get: getWithDefaults,
        post: postWithDefaults,
        postFormData: postFormDataWithDefault
    };
}

function parseAndCheckLogin(ctx, defaultFuncs, retryCount) {
    if (retryCount == undefined) retryCount = 0;
    return function(data) {
        return bluebird.try(function() {
            log.verbose("parseAndCheckLogin", data.body);
            if (data.statusCode >= 500 && data.statusCode < 600) {
                if (retryCount >= 5) {
                    throw {
                        error: "Request retry failed. Check the `res` and `statusCode` property on this error.",
                        statusCode: data.statusCode,
                        res: data.body
                    };
                }
                retryCount++;
                var retryTime = Math.floor(Math.random() * 5000);
                log.warn("parseAndCheckLogin", "Got status code " + data.statusCode + " - " + retryCount + ". attempt to retry in " + retryTime + " milliseconds...");
                var url = data.request.uri.protocol + "//" + data.request.uri.hostname + data.request.uri.pathname;
                if (data.request.headers["Content-Type"].split(";")[0] === "multipart/form-data") {
                    return bluebird.delay(retryTime).then(() => defaultFuncs.postFormData(url, ctx.jar, data.request.formData, {}))
                        .then(parseAndCheckLogin(ctx, defaultFuncs, retryCount));
                } else {
                    return bluebird.delay(retryTime).then(() => defaultFuncs.post(url, ctx.jar, data.request.formData))
                        .then(parseAndCheckLogin(ctx, defaultFuncs, retryCount));
                }
            }
            if (data.statusCode !== 200) throw new Error("parseAndCheckLogin got status code: " + data.statusCode + ". Bailing out of trying to parse response.");

            var res = null;
            try {
                res = JSON.parse(makeParsable(data.body));
            } catch (e) {
                throw {
                    error: "JSON.parse error. Check the `detail` property on this error.",
                    detail: e,
                    res: data.body
                };
            }

            // In some cases the response contains only a redirect URL which should be followed
            if (res.redirect && data.request.method === "GET") return defaultFuncs.get(res.redirect, ctx.jar).then(parseAndCheckLogin(ctx, defaultFuncs));

            // TODO: handle multiple cookies?
            if (res.jsmods && res.jsmods.require && Array.isArray(res.jsmods.require[0]) && res.jsmods.require[0][0] === "Cookie") {
                res.jsmods.require[0][3][0] = res.jsmods.require[0][3][0].replace("_js_", "");
                var cookie = formatCookie(res.jsmods.require[0][3], "facebook");
                var cookie2 = formatCookie(res.jsmods.require[0][3], "messenger");
                ctx.jar.setCookie(cookie, "https://www.facebook.com");
                ctx.jar.setCookie(cookie2, "https://www.messenger.com");
            }

            // On every request we check if we got a DTSG and we mutate the context so that we use the latest
            // one for the next requests.
            if (res.jsmods && Array.isArray(res.jsmods.require)) {
                var arr = res.jsmods.require;
                for (var i in arr) {
                    if (arr[i][0] === "DTSG" && arr[i][1] === "setToken") {
                        ctx.fb_dtsg = arr[i][3][0];

                        // Update ttstamp since that depends on fb_dtsg
                        ctx.ttstamp = "2";
                        for (var j = 0; j < ctx.fb_dtsg.length; j++) ctx.ttstamp += ctx.fb_dtsg.charCodeAt(j);
                    }
                }
            }

            if (res.error === 1357001) throw { error: "Chưa Đăng Nhập Được - Appstate Đã Bị Lỗi" };
            return res;
        });
    };
}

function saveCookies(jar) {
    return function(res) {
        var cookies = res.headers["set-cookie"] || [];
        cookies.forEach(function(c) {
            if (c.indexOf(".facebook.com") > -1) jar.setCookie(c, "https://www.facebook.com");
            var c2 = c.replace(/domain=\.facebook\.com/, "domain=.messenger.com");
            jar.setCookie(c2, "https://www.messenger.com");
        });
        return res;
    };
}

var NUM_TO_MONTH = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
];
var NUM_TO_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(date) {
    var d = date.getUTCDate();
    d = d >= 10 ? d : "0" + d;
    var h = date.getUTCHours();
    h = h >= 10 ? h : "0" + h;
    var m = date.getUTCMinutes();
    m = m >= 10 ? m : "0" + m;
    var s = date.getUTCSeconds();
    s = s >= 10 ? s : "0" + s;
    return (NUM_TO_DAY[date.getUTCDay()] + ", " + d + " " + NUM_TO_MONTH[date.getUTCMonth()] + " " + date.getUTCFullYear() + " " + h + ":" + m + ":" + s + " GMT");
}

function formatCookie(arr, url) {
    return arr[0] + "=" + arr[1] + "; Path=" + arr[3] + "; Domain=" + url + ".com";
}

function formatThread(data) {
    return {
        threadID: formatID(data.thread_fbid.toString()),
        participants: data.participants.map(formatID),
        participantIDs: data.participants.map(formatID),
        name: data.name,
        nicknames: data.custom_nickname,
        snippet: data.snippet,
        snippetAttachments: data.snippet_attachments,
        snippetSender: formatID((data.snippet_sender || "").toString()),
        unreadCount: data.unread_count,
        messageCount: data.message_count,
        imageSrc: data.image_src,
        timestamp: data.timestamp,
        serverTimestamp: data.server_timestamp, // what is this?
        muteUntil: data.mute_until,
        isCanonicalUser: data.is_canonical_user,
        isCanonical: data.is_canonical,
        isSubscribed: data.is_subscribed,
        folder: data.folder,
        isArchived: data.is_archived,
        recipientsLoadable: data.recipients_loadable,
        hasEmailParticipant: data.has_email_participant,
        readOnly: data.read_only,
        canReply: data.can_reply,
        cannotReplyReason: data.cannot_reply_reason,
        lastMessageTimestamp: data.last_message_timestamp,
        lastReadTimestamp: data.last_read_timestamp,
        lastMessageType: data.last_message_type,
        emoji: data.custom_like_icon,
        color: data.custom_color,
        adminIDs: data.admin_ids,
        threadType: data.thread_type
    };
}

function getType(obj) {
    return Object.prototype.toString.call(obj).slice(8, -1);
}

function formatProxyPresence(presence, userID) {
    if (presence.lat === undefined || presence.p === undefined) return null;
    return {
        type: "presence",
        timestamp: presence.lat * 1000,
        userID: userID || '',
        statuses: presence.p
    };
}

function formatPresence(presence, userID) {
    return {
        type: "presence",
        timestamp: presence.la * 1000,
        userID: userID || '',
        statuses: presence.a
    };
}

function decodeClientPayload(payload) {
    /*
    Special function which Client using to "encode" clients JSON payload
    */
    function Utf8ArrayToStr(array) {
        var out, i, len, c;
        var char2, char3;
        out = "";
        len = array.length;
        i = 0;
        while (i < len) {
            c = array[i++];
            switch (c >> 4) {
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                case 5:
                case 6:
                case 7:
                    out += String.fromCharCode(c);
                    break;
                case 12:
                case 13:
                    char2 = array[i++];
                    out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                    break;
                case 14:
                    char2 = array[i++];
                    char3 = array[i++];
                    out += String.fromCharCode(((c & 0x0F) << 12) | ((char2 & 0x3F) << 6) | ((char3 & 0x3F) << 0));
                    break;
            }
        }
        return out;
    }
    return JSON.parse(Utf8ArrayToStr(payload));
}

function getAppState(jar) {
    var appstate = jar.getCookies("https://www.facebook.com").concat(jar.getCookies("https://facebook.com")).concat(jar.getCookies("https://www.messenger.com"));
    if (!require(process.cwd() + "/MetaCore_Config.json").Encrypt_Appstate) return appstate;
    var StateCrypt = require('./utils/StateCrypt');
    var logger = require('./logger');
    logger('Start Encrypt Appstate !', '[ MetaCore ]');
    if (getKeyValue("AppstateKey1") || getKeyValue("AppstateKey2") || getKeyValue("AppstateKey2")) {
        logger('Encrypt Appstate Success !', '[ MetaCore ]');
        return StateCrypt.encryptState(JSON.stringify(appstate),getKeyValue("AppstateKey1"),getKeyValue("AppstateKey2"),getKeyValue("AppstateKey3"));
    }
   else return appstate;
}
module.exports = {
    isReadableStream:isReadableStream,
    get:get,
    post:post,
    postFormData:postFormData,
    generateThreadingID:generateThreadingID,
    generateOfflineThreadingID:generateOfflineThreadingID,
    getGUID:getGUID,
    getFrom:getFrom,
    makeParsable:makeParsable,
    arrToForm:arrToForm,
    getSignatureID:getSignatureID,
    getJar: request.jar,
    generateTimestampRelative:generateTimestampRelative,
    makeDefaults:makeDefaults,
    parseAndCheckLogin:parseAndCheckLogin,
    saveCookies,
    getType,
    _formatAttachment,
    formatHistoryMessage,
    formatID,
    formatMessage,
    formatDeltaEvent,
    formatDeltaMessage,
    formatProxyPresence,
    formatPresence,
    formatTyp,
    formatDeltaReadReceipt,
    formatCookie,
    formatThread,
    formatReadReceipt,
    formatRead,
    generatePresence,
    generateAccessiblityCookie,
    formatDate,
    decodeClientPayload,
    getAppState,
    getAdminTextMessageType,
    setProxy
};