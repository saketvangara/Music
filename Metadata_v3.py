import sys
import urllib2
import urllib
import re
from urllib import urlopen
import json 
import difflib
import pymysql
import youtube_dl
from apiclient.discovery import build
from apiclient.errors import HttpError
from oauth2client.tools import argparser
import time
import soundcloud
from urllib import quote
        
rotation_symbols = ['\|', '/', ',', '\+', ';', '_']
re_remparenthesis = re.compile('(.+)\s(\(.+?\))\s*(.*)')

DEVELOPER_KEY = "AIzaSyAMmUy5kLgrou4yg_9eYZH778Q57e98bKk"
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

global conn
conn=pymysql.connect(db='soundcloud', user='root' , host= 'localhost' , port=3307)
global cursor
cursor=conn.cursor()

client = soundcloud.Client(client_id='e9254de57c63214abef885f505100d91')

page_size = 200

t='house'
# get first 200 tracks
tracks = client.get('/tracks', 
            duration={'from':'120000','to':'600000'}, 
            tags = t,
            order_desc = 'playback_count',
            limit=page_size,
            linked_partitioning=1
            )


def search_video(title):
  search_response = youtube.search().list(
    q=title,
    part="id,snippet",
    maxResults=10
  ).execute()

  for search_result in search_response.get("items", []):
    if search_result["id"]["kind"] == "youtube#video":
        return search_result["id"]["videoId"], search_result["snippet"]["title"]
        

        
def remove_parenthesis(s):
    """
    Remove parenthesis, like Thierry (Coolest guy)
    """
    m = re_remparenthesis.match(s)
    if not m:
        return s
    parts = m.groups()
    assert len(parts) >= 2
    if len(parts) == 2:
        return parts[0]
    return parts[0] + ' ' + parts[2]

def replace_rotation_symbols(s):
    """
    Mostly, replace '&' by 'and'
    """
    return re_rotsymbols.sub(' and ', s)
    
def Normalize(str):
    text=str
    text=(''.join([i if ord(i) < 128 else ' ' for i in text]))
    count=text.count('(')
    print(count)
    #while count>0:
        #text=remove_parenthesis(text)
        #count=count-1
    print(text)   
    query = text
    stopwords = ['vs', 'vs.', 'mp3', '.mp3', 'lyrics' ,'video', 'free' , 'download']
    querywords = query.split()
    resultwords  = [word for word in querywords if word.lower() not in stopwords]
    result_rem = ' '.join(resultwords)
    print result_rem
    #space_replace=result_rem.replace(' ', '%20')
    space_replace=result_rem        
    new_text_2=space_replace
    print(new_text_2)
    
    #if '&' in new_text_2:
        #new_text_4=new_text_2.replace('&', '%26')
    #else:
    new_text_4=new_text_2
    new_text_4=quote(new_text_4, safe='')
    print(new_text_4)
    return new_text_4



for i in tracks.collection:
    track_title=i['title']
    track_id=i['id']
    sc_duration=i['duration']/1000
    min_d=sc_duration-5
    max_d=sc_duration+5
    try:
        cursor.execute("insert into metadata set sc_t_id=%s , sc_track_title=%s, sc_duration=%s, sc_q_tag=%s ", (i['id'], i['title'].encode('utf-8'),i['duration']/1000, t))
        conn.commit()
        try:
            youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,developerKey=DEVELOPER_KEY)
            videoID, videoTitle = search_video(track_title)
            print("\tFound video: '" + videoTitle + "' - ID: " + videoID)
            yt_vid=videoID
            perm=videoTitle.lower()
        except:
            yt_vid='NA'
            perm=track_title.lower()
        new_text_3=Normalize(perm)
        api_beg='http://developer.echonest.com/api/v4/song/search?api_key=OZ8G9N2O7YFPZIRXN&format=json&results=3&combined='
        api_end='&bucket=audio_summary&bucket=song_hotttnesss&bucket=artist_hotttnesss&min_duration='
        api_end_2='&max_duration='
        api_final=api_beg + new_text_3 + api_end+str(min_d)+api_end_2+str(max_d)
        print(api_final)
        html=urlopen(api_final).read()
        result=json.loads(html)
        iter=0
        try:
            for j in result['response']['songs']:
                print("iteration #", iter+1)
                iter=iter+1
                artist=j['artist_name']
                print(artist)
                song_name=j['title']
                duration_en=j['audio_summary']['duration']
                print(song_name)
                compare_term=artist + ' ' + song_name
                compare_term=compare_term.lower()
                print(compare_term)
                seq=difflib.SequenceMatcher(None,compare_term, perm)
                similarity= seq.ratio()
                print(similarity)
                if similarity>0.50:
                    artist_final=artist
                    song_final=song_name
                    analysis_url=j['audio_summary']['analysis_url']
                    artist_id=j['artist_id']
                    song_id=j['id']
                    try:
                        hotness_song=j['song_hotttnesss']
                    except:
                        hotness_song='NA'    
                    try:
                        hotness_artist=j['artist_hotttnesss']
                    except:
                        hotness_artist='NA'    
                    print(analysis_url)
                    algo=1
                    cursor.execute("update metadata set y_vid=%s, ec_artist_name=%s , ec_artist_id=%s , ec_song_name=%s , ec_song_id=%s , ec_match_percent=%s , ec_analysis_url=%s , algo_ec=%s, ec_duration=%s , ec_song_hot=%s, ec_artist_hotness=%s , y_track_title=%s where sc_t_id=%s", (yt_vid.encode('utf-8'), artist_final.encode('utf-8') , artist_id.encode('utf-8') , song_final.encode('utf-8') , song_id.encode('utf-8') , similarity, analysis_url.encode('utf-8'),algo , duration_en, hotness_song, hotness_artist, videoTitle.encode('utf-8'),  track_id  ))
                    print("query loaded")
                    conn.commit()
                    api_beg_g='http://developer.echonest.com/api/v4/artist/profile?api_key=OZ8G9N2O7YFPZIRXN&'
                    api_end_g='&bucket=genre&format=json'
                    api_final_g=api_beg_g+'name='+artist_final+api_end_g
                    url= urlopen(api_final_g).read()
                    print('url read')
                    result_g=json.loads(url)
                    print('result decoded')
                    try:
                        genre= result_g['response']['artist']['genres'][0]['name']
                        cursor.execute("update metadata set ec_genre=%s where sc_t_id=%s" , (genre.encode('utf-8'),track_id))
                        conn.commit()
                    except:
                        pass    
                    break
                else:
                    print("trying next item")
                    algo=2
                    cursor.execute("update metadata set algo_ec=%s where sc_t_id=%s", (algo,track_id))
                    conn.commit()                   
        except:
            print("Issue Found")
            cursor.execute("update metadata set algo_ec=3 where sc_t_id=%s", (track_id))
            conn.commit()
            time.sleep(30)
        api_beg_lfm='http://ws.audioscrobbler.com/2.0/?method=track.search&api_key=4ed88e80f40beff71d79259b26990888&track='
        api_end_lfm='&format=json'
        api_final_lfm=  api_beg_lfm+new_text_3+ api_end_lfm
        url_lfm=urlopen(api_final_lfm).read()
        try:
            json_lfm=json.loads(url_lfm)
            print(json_lfm)
            for k in json_lfm['results']['trackmatches']['track']:
                artist_lfm=k['artist']
                song_name_lfm=k['name']
                compare_term_lfm=artist_lfm + ' ' + song_name_lfm
                compare_term_lfm=compare_term_lfm.lower()
                print("lfm:", compare_term_lfm)
                seq=difflib.SequenceMatcher(None,compare_term_lfm, perm)
                similarity= seq.ratio()
                if similarity>0.40:
                    cursor.execute("update metadata set Lfm_artist_name=%s, Lfm_Song_Name=%s, Lfm_match_percent=%s,algo_Lfm=1 where sc_t_id=%s" , ( artist_lfm.encode('utf-8'), song_name_lfm.encode('utf-8'), similarity,track_id))
                    conn.commit()
                    break
                else:
                    print("trying next item")
                    algo=2
                    cursor.execute("update metadata set algo_lfm=%s where sc_t_id=%s", (algo,track_id))
                    conn.commit()
        except:
            pass
    except:
        print("Duplicate Entry")
        pass     
next=tracks.next_href
print(next)

while True:
    tracks = urlopen(next).read()
    result=json.loads(tracks)        
    for i in result['collection']:
        track_title=i['title']
        track_id=i['id']
        sc_duration=i['duration']/1000
        min_d=sc_duration-5
        max_d=sc_duration+5
        try:
            cursor.execute("insert into metadata set sc_t_id=%s , sc_track_title=%s, sc_duration=%s, sc_q_tag=%s ", (i['id'], i['title'].encode('utf-8'),i['duration']/1000, t))
            conn.commit()
            try:
                youtube = build(YOUTUBE_API_SERVICE_NAME, YOUTUBE_API_VERSION,developerKey=DEVELOPER_KEY)
                videoID, videoTitle = search_video(track_title)
                print("\tFound video: '" + videoTitle + "' - ID: " + videoID)
                yt_vid=videoID
                perm=videoTitle.lower()
            except:
                yt_vid='NA'
                perm=track_title.lower()
            new_text_3=Normalize(perm)
            api_beg='http://developer.echonest.com/api/v4/song/search?api_key=OZ8G9N2O7YFPZIRXN&format=json&results=3&combined='
            api_end='&bucket=audio_summary&bucket=song_hotttnesss&bucket=artist_hotttnesss&min_duration='
            api_end_2='&max_duration='
            api_final=api_beg + new_text_3 + api_end+str(min_d)+api_end_2+str(max_d)
            print(api_final)
            html=urlopen(api_final).read()
            result=json.loads(html)
            iter=0
            try:
                for j in result['response']['songs']:
                    print("iteration #", iter+1)
                    iter=iter+1
                    artist=j['artist_name']
                    print(artist)
                    song_name=j['title']
                    duration_en=j['audio_summary']['duration']
                    print(song_name)
                    compare_term=artist + ' ' + song_name
                    compare_term=compare_term.lower()
                    print(compare_term)
                    seq=difflib.SequenceMatcher(None,compare_term, perm)
                    similarity= seq.ratio()
                    print(similarity)
                    if similarity>0.50:
                        artist_final=artist
                        song_final=song_name
                        analysis_url=j['audio_summary']['analysis_url']
                        artist_id=j['artist_id']
                        song_id=j['id']
                        try:
                            hotness_song=j['song_hotttnesss']
                        except:
                            hotness_song='NA'    
                        try:
                            hotness_artist=j['artist_hotttnesss']
                        except:
                            hotness_artist='NA'    
                        print(analysis_url)
                        algo=1
                        cursor.execute("update metadata set y_vid=%s, ec_artist_name=%s , ec_artist_id=%s , ec_song_name=%s , ec_song_id=%s , ec_match_percent=%s , ec_analysis_url=%s , algo_ec=%s, ec_duration=%s , ec_song_hot=%s, ec_artist_hotness=%s , y_track_title=%s where sc_t_id=%s", (yt_vid.encode('utf-8'), artist_final.encode('utf-8') , artist_id.encode('utf-8') , song_final.encode('utf-8') , song_id.encode('utf-8') , similarity, analysis_url.encode('utf-8'),algo , duration_en, hotness_song, hotness_artist, videoTitle.encode('utf-8'),  track_id  ))
                        print("query loaded")
                        conn.commit()
                        api_beg_g='http://developer.echonest.com/api/v4/artist/profile?api_key=OZ8G9N2O7YFPZIRXN&'
                        api_end_g='&bucket=genre&format=json'
                        api_final_g=api_beg_g+'name='+artist_final+api_end_g
                        url= urlopen(api_final_g).read()
                        print('url read')
                        result_g=json.loads(url)
                        print('result decoded')
                        try:
                            genre= result_g['response']['artist']['genres'][0]['name']
                            cursor.execute("update metadata set ec_genre=%s where sc_t_id=%s" , (genre.encode('utf-8'),track_id))
                            conn.commit()
                        except:
                            pass    
                        break
                    else:
                        print("trying next item")
                        algo=2
                        cursor.execute("update metadata set algo_ec=%s where sc_t_id=%s", (algo,track_id))
                        conn.commit()                   
            except:
                print("Issue Found")
                cursor.execute("update metadata set algo_ec=3 where sc_t_id=%s", (track_id))
                conn.commit()
                time.sleep(30)
            api_beg_lfm='http://ws.audioscrobbler.com/2.0/?method=track.search&api_key=4ed88e80f40beff71d79259b26990888&track='
            api_end_lfm='&format=json'
            api_final_lfm=  api_beg_lfm+new_text_3+ api_end_lfm
            url_lfm=urlopen(api_final_lfm).read()
            try:
                json_lfm=json.loads(url_lfm)
                print(json_lfm)
                for k in json_lfm['results']['trackmatches']['track']:
                    artist_lfm=k['artist']
                    song_name_lfm=k['name']
                    compare_term_lfm=artist_lfm + ' ' + song_name_lfm
                    compare_term_lfm=compare_term_lfm.lower()
                    print("lfm:", compare_term_lfm)
                    seq=difflib.SequenceMatcher(None,compare_term_lfm, perm)
                    similarity= seq.ratio()
                    if similarity>0.40:
                        cursor.execute("update metadata set Lfm_artist_name=%s, Lfm_Song_Name=%s, Lfm_match_percent=%s,algo_Lfm=1 where sc_t_id=%s" , ( artist_lfm.encode('utf-8'), song_name_lfm.encode('utf-8'), similarity,track_id))
                        conn.commit()
                        break
                    else:
                        print("trying next item")
                        algo=2
                        cursor.execute("update metadata set algo_lfm=%s where sc_t_id=%s", (algo,track_id))
                        conn.commit()
            except:
                pass
        except:
            print("Duplicate Entry")
            pass       
        try:
            next=result['next_href']
            print(next)
        except:
            print("All Inserted")
            break                      