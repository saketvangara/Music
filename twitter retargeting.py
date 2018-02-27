# -*- coding: utf-8 -*-

import tweepy
from tweepy import Stream
from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
import json
import time
import pymysql
import sys
import extraction
import requests
import codecs
import urllib2
import urllib 
from urllib import urlopen
from BeautifulSoup import BeautifulSoup
import soundcloud
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
from urllib import quote_plus
import re
import string
import tldextract
from random import randint
import pytz
from datetime import datetime
from itertools import combinations
import youtube_dl
from apiclient.discovery import build
from apiclient.errors import HttpError
from oauth2client.tools import argparser

#twitter access credentials
consumer_key = '3PwjjDvl1Zqci5r3WjiXzDm6Z'
consumer_secret = 'Qy2LHSZlCgPm8YECixqx9s09OcB6ZBpVQwswVasgmV21a4pH2G' 
access_token = '2354624653-AwnVs5Ti4gaAT3l4H4OqduXO3Ux0KbITLQBMp4o'
access_secret = 'eXBSvzYDgM0GKe1iOqVR4qWz3gjxdTh3csi32LXHZzgNi'

auth = OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_secret)

page_size=200
#soundcloud access credentials
client = soundcloud.Client(client_id='e9254de57c63214abef885f505100d91')


#for seeding from comments

comments_url='https://52.74.224.179:8088/soundcloud/snippets'
sc_api_beg='https://api.soundcloud.com/tracks.json?limit=200&client_id=e9254de57c63214abef885f505100d91'
sc_api_mid='&duration[to]='
sc_api_end='&q='
trbble_find_api='http://api.trbble.com:8080/trbble/GetSimilarTrbbles?data='

def random_endtime(batch):
    if batch==1:
        endtime=randint(20,25)
    elif batch==2:
        endtime=randint(26,30)
    elif batch==3:
        endtime=randint(31,35)
    else:
        endtime=randint(36,42)
    return endtime                    


def Normalize(title):
    query = title.lower()
    query=re.sub('\/',' ',query)
    re1=re.sub('\(',' ( ',query)
    re2=re.sub('\)',' ) ',re1)
    re3=re.sub('\[',' ( ',re2)
    re4=re.sub('\]',' ) ',re3)
    re5=re.sub('\{',' ( ',re4)
    re6=re.sub('\}',' ) ',re5)
    print re6
    stopwords = ['2013','2014','2015','2011','2010','2012','2009','01','02','03','04','05','06','07','08','09','10','11',
              '12','13','14','15','16','17','18','19','01.','02.','03.','04.','05.','06.','07.','08.','09.','10.',
              '11.','12.','13.','14.','15.','17.','18.','19.','1.','2.','3.','4.','5.','6.','7.','8.','9.','@','thissongissick.com','–','preview','asot600','&']
    querywords = re6.split()
    resultwords = [word for word in querywords if word.lower() not in stopwords]
    result11 = ' '.join(resultwords)
    f2 = re.sub(r'(?i)\b((?:https?://|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:\'".,<>?«»“”‘’]))', '', result11)
    result1=re.sub('(\( prod.|\( mixed|\( produced by|\( prod. by|\( prod by|\( cover|\( with|\( album|\( mastered by|\( cut|\( enhanced|\( out|\(www).*?(}|]|\)|.mp3|mp3|.com|download|records)','',f2, flags=re.DOTALL)
    result2=re.sub('(\[ prod.|\[ mixed|\[ produced by|\[ prod. by|\[ prod by|\[ cover|\( with|\[ album|\[ mastered by|\[ cut|\[ enhanced|\[ out|\[www).*?(}|]|\)|.mp3|mp3|.com|download|records)','',result1, flags=re.DOTALL)
    result3=re.sub('(\{ prod.|\{ mixed|\{ produced by|\{ prod. by|\{ prod by|\{ cover|\( with|\{ album|\{ mastered by|\{ cut|\{ enhanced|\{ out|\{www).*?(}|]|\)|.mp3|mp3|.com|download|records)','',result2, flags=re.DOTALL)    
    result4=re.sub('\w+.(\.com|\.net|\.ws|\.org)\s?','',result3)
    result5=re.sub('mp3.*?(\.com|\.net|\.ws|\.org)','',result4, flags=re.DOTALL)
    rep={
            "fast download":"", "free download":"", "demo":"", "@":"", "out now":"","outnow":"",":":" ","produced by":"","produced":"",
            "free dl":"","!":"","**":"","***":"","--":"","*":"","youtube":"","video":"","lyrics":"","premiere":"","bpm":"","hq":"",
            "( first edit )":"","download!":"","download":"","freemp3":"","dl":"","mp3 link":"","mp3link":"","link mp3":"","linkmp3":"",
            "**free mp3 download**":"","songs.pk":"",":":"","free 320":"","full version":"","/":"","|":"","//":"","mastered":"",
            "4songs.pk":"","~":"","mp3 audio":"","remix.mp3":"","::":"","thissongissick.com":"","preview":"","_":" ","[":"","]":"",
            "available now!":"","unreleased":"","video link":"","prod":"","()":"","available on":"","low res":"",
            "high res":"","@":"","prerelease":"","128k":"","320k":"","64k":"","sc edit":"","bps":"","short version":"","mp3":"",
            ".mp3":"","*free download*":"","snippet":"","remastered":"","| |":"","remixfree download":"","!!":"","!!!":"","/ /":"",
            "**free download**":"","mixfree download":"","production":"","productions":"","// free download":"","d/l":"","episode out now!":"",
            "***free download***":"","free download!!!":"","unmastered":"","out now!!":"","anjunadeep":"","preview clip":"","320kbps":"",
            "||":"","ep preview ":"","download:":"","free download:":"",":wumpscut:":"","preview out now!":"","bootlegfree download":"",
            "///":"","remix.mp3":"","preview out now":"","mixout now":"","remixfree dl":"","remixpreview":"","remixout now":"","*out now*":"",
            "deep free download":"","editfree":"","cd2:":"","cd1:":"","ep out now":"","sample":"","official preview":"","%":"",
            "official video":"",";":"","free track":"","spinnin":"","presents:":"","freedownload":"","2013/2014":"","demos":"","unreleased demo":"",
            "samples":"","etc!":""," pre-production":"","master audio":"","album teaser":"","*free download description*":"","premierefree":"",
            "exclusive":"","best quality":"","( )":"","(  )":"","lyric":"","official music":"","future house":"","available on itunes":"","on itunes":"",
            "played on":"","asot":"","–":"-","minimix":"","pres.":"","soundcloud edit":" ","(exclusive preview)":" ","exclusive": " ","dl in description":"",
            "spotify":" ","beatport":" ","teaser":"","&":"%26","vs.":"vs","vs":" "
        }
    rep = dict((re.escape(k), v) for k, v in rep.iteritems())
    pattern = re.compile("|".join(rep.keys()))
    text = pattern.sub(lambda m: rep[re.escape(m.group(0))], result5)
    return(text)
    
def insert_space(text):
    query = text.lower()
    query=re.sub('\/',' ',query)
    re1=re.sub('\(',' ( ',query)
    re2=re.sub('\)',' ) ',re1)
    re3=re.sub('\[',' ( ',re2)
    re4=re.sub('\]',' ) ',re3)
    re5=re.sub('\{',' ( ',re4)
    re6=re.sub('\}',' ) ',re5)
    return (re6)



spotify_combined='https://api.spotify.com/v1/search?&type=track&authorisation=d77fe7100c19465b81934166937c45cd&q='

artistname=[]
songname=[]
listremove=[]
f=[]

def split(text):
    words=text.split()
    return words

def check(a, b):
    s=len(a)
    while True:
        for i in a:
           if i in b:
              listremove.append(i)
        return listremove
    return False

def checksum(a, b):
        for i in a:
           if i in b:
              return i
        return False    
    
def get_channel(expanded_url):
    long_url=urlopen(expanded_url)
    print("twitter url=",expanded_url)
    channel=tldextract.extract(long_url.url)
    channel=channel.domain
    print(channel)
    if channel=='shazam':
        soup = BeautifulSoup(urllib2.urlopen(expanded_url))
        print("Song Title extracted")
        track_title=soup.find('title').text
        print(track_title)
        track_title= track_title.split(' Song Lyrics | Shazam')[0]
        track_title=Normalize(track_title)
    elif channel=='soundhound':
        soup = BeautifulSoup(urllib2.urlopen(expanded_url))
        title=soup.find('title').text
        title= title.strip('SoundHound - ')   
        print(title)
        track_title=Normalize(title)
    elif channel=='pandora':
        soup = BeautifulSoup(urllib2.urlopen(expanded_url))
        title=soup.find('title').text
        track_title=Normalize(title)
    elif channel=='di':
        try:
            soup = BeautifulSoup(urllib2.urlopen(expanded_url))
            title=soup.find('title').text
            track_title=title.split('|')[0]
        except Exception as a:
            print(a)
            track_title=None    
    elif channel=='spotify':
        track_uri=urlopen(expanded_url).url
        track_id_array=track_uri.split('/')
        url_array_len=len(track_id_array)
        if 'track' in track_id_array:
            track_id=track_id_array[url_array_len-1]
            get_spotify_song_title='https://api.spotify.com/v1/tracks/'+track_id+'?authorisation=d77fe7100c19465b81934166937c45cd'
            hit_spotify_song_title_api=urlopen(get_spotify_song_title).read()
            spotify_song_title_json=json.loads(hit_spotify_song_title_api)
            song_name=spotify_song_title_json['name']
            artist_name=spotify_song_title_json['artists'][0]['name']
            track_title=artist_name +'-'+ song_name
        else:
            track_title=None
    #elif channel=='soundcloud':
        #track_uri=urlopen(expanded_url).url
        #track_uri=track_uri.split('?')[0]
        #sc_resolve_url='http://api.soundcloud.com/resolve.json?client_id=e9254de57c63214abef885f505100d91&url='+quote_plus(track_uri.encode('utf-8'))
        #get_sc_resolve_url=urlopen(sc_resolve_url).read()
        #sc_resolve_json=json.loads(get_sc_resolve_url)
        #if 'kind' in sc_resolve_json:
            #if sc_resolve_json['kind']=='track' and 'cover' not in sc_resolve_json['title']:
                #track_title= sc_resolve_json['title']            
            #else:
                #track_title=None
        #else:
            #track_title=None
    elif channel=='8tracks':
         soup = BeautifulSoup(urllib2.urlopen(expanded_url))
         meta_tags=soup.find(attrs={'name':'keywords'})
         track_title= meta_tags['content']
    elif channel=='hypem':
         soup = BeautifulSoup(urllib2.urlopen(expanded_url))
         track_title=soup.find('title').text
         track_title= track_title.strip(' posted on music blogs / Hype Machine')
    elif channel=='pitchfork':
         hdr = {'User-Agent': 'Mozilla/5.0'}
         req = urllib2.Request(expanded_url,headers=hdr)
         page = urllib2.urlopen(req)
         soup = BeautifulSoup(page)
         try:
             track_title=soup.find('span' , attrs={'class' :'p4k-player-track'}).text
             track_title=track_title.replace("&quot"," ")
             track_title=track_title.replace(":","")
             track_title=track_title.replace(";","")
         except:
             track_title=None
    elif channel=='mixcloud':
         hdr = {'User-Agent': 'Mozilla/5.0'}
         req = urllib2.Request(expanded_url,headers=hdr)
         page = urllib2.urlopen(req)
         soup = BeautifulSoup(page)
         title=soup.find('title').text
         track_title=title.split('|')[0]
    elif channel=='awa':
        try:
            soup = BeautifulSoup(urllib2.urlopen(expanded_url))
            track=soup.find('div' , attrs={'class':'track__info__name'}).text
            artist=soup.find('div' , attrs={'class':'track__info__artist'}).text
            track_title=artist+'-'+track
        except:
            track_title=None
    elif channel=='youtube':
        try:
            soup = BeautifulSoup(urllib2.urlopen(expanded_url))
            meta_tag=soup.find('meta', attrs={'name':'twitter:title'})
            track_title=meta_tag['content']
        except:
            track_title=None                                                           
    else:
        track_title=None
    if track_title is not None:
        track_title=Normalize(track_title)
        print(channel, track_title)
    else:    
        print(channel, track_title)
    return channel, track_title  

def echonest_check(track_title):
    ec_api_rand=randint(1,6)
    if ec_api_rand>3:
        api_beg='http://developer.echonest.com/api/v4/song/search?api_key=OZ8G9N2O7YFPZIRXN&format=json&results=15&bucket=audio_summary&combined='
    else:
        api_beg='http://developer.echonest.com/api/v4/song/search?api_key=6NC5SSGFH5UELRXDS&format=json&results=15&bucket=audio_summary&combined='                    
    ec_api=api_beg+quote_plus(track_title.encode('utf-8'))
    open_ec_api=urlopen(ec_api).read()
    ec_json=json.loads(open_ec_api)
    if ec_json['response']['status']['code']==0 and len(ec_json['response']['songs'])>0:
        for i in ec_json['response']['songs']:
            artist_name=i['artist_name']
            song_name=i['title']
            artist_id=i['artist_id']
            song_id=i['id']
            ec_track_title=artist_name + '-' + song_name
            similarity= fuzz.token_sort_ratio(track_title,ec_track_title)
            if similarity>=80:
                artist_name_final=artist_name
                song_name_final=song_name
                artist_id_final=i['artist_id']
                song_id_final=i['id']
                track_title_final=ec_track_title
                track_duration=i['audio_summary']['duration']
                break
            else:
                artist_name_final=None
                song_name_final=None
                artist_id_final=None
                song_id_final=None
                track_duration=None
                track_title_final=None
                print("checking next entry in EC JSON")
                pass 
    else:
        artist_name_final=None
        song_name_final=None
        artist_id_final=None
        song_id_final=None
        track_duration=None
        track_title_final=None
        track_title_final=None
        print("No result found in EC")
        pass
    print("ec result=",artist_name_final,song_name_final,artist_id_final,song_id_final,track_title_final,track_duration)     
    return artist_name_final,song_name_final,artist_id_final,song_id_final,track_title_final,track_duration 


def posting_to_db(Channel,Handle,country,tweet,Device,mt_artist,mt_song_name,mt_trbble_id,reply,tweet_time):
    trbble_url='https://www.trbble.com/trbble?q='+mt_trbble_id+'&utm_medium=twitter&utm_source='+Channel+'&utm_campaign='+Handle
    bitly_api_beg='https://api-ssl.bitly.com/v3/shorten?access_token=d1040ddda961aff8e0f82dd38e66f2594cf06e48&longUrl='
    bitly_complete_api=bitly_api_beg+quote_plus(trbble_url)
    open_bitly=urlopen(bitly_complete_api).read()
    bitly_json=json.loads(open_bitly)
    print(bitly_json)
    bitly_url=bitly_json['data']['url']
    bitly_hash=bitly_json['data']['hash']
    global_hash=bitly_json['data']['global_hash']
    cursor.execute("insert into twitter_users set handle=%s,country=%s,tweet=%s,Device=%s,artist_name=%s,song_name=%s,sc_t_id=%s,reply_type=%s,bitly_url=%s,bitly_hash=%s,bitly_g_hash=%s,channel=%s,tweet_time=%s", (Handle,country,tweet,Device,mt_artist,mt_song_name,mt_trbble_id,reply,bitly_url,bitly_hash,global_hash,Channel,tweet_time))
    conn.commit()


def seed_trbble(mt_song_name,mt_start_time,mt_end_time,mt_trbble_duration,mt_track_id,mt_trbble_url,mt_sc_url,mt_album_art,mt_artist,mt_genres,mt_sc_duration):
    trbble_api_beg='http://api.trbble.com:8080//trbble/CreateTrbble?data='
    payload=json.dumps({"title":quote_plus(mt_song_name.encode('utf-8')),"trbbleStart":mt_start_time,"trbbleEnd":mt_end_time,"trbbleLength":mt_trbble_duration,
                        "trackId":mt_track_id,"trackName":quote_plus(mt_song_name.encode('utf-8')),
                        "trackUrl":mt_trbble_url,"source":"soundcloud","permalinkUrl":quote_plus(mt_sc_url.encode('utf-8')),
                        "createdBy":"trbbleBot","albumArt":mt_album_art,
                        "tags":"","artist":quote_plus(mt_artist.encode('utf-8')),
                        "genre":quote_plus(mt_genres.encode('utf-8')),"trackLength":mt_sc_duration,"language":"english","isPrivate":False,"userId":"72c18ac0-12a8-4127-9f9b-256084a94a17","mood":""})
    header={'Auth':'49a7d835-797e-4398-876a-91277d3b5cb3'}
    #print(payload)
    open_trbble_create=requests.post(trbble_api_beg,data=payload,headers=header,verify='False')
    print(open_trbble_create.json())
    create_trbble_result=json.dumps(open_trbble_create.json())
    create_trbble_result=json.loads(create_trbble_result)
    print(create_trbble_result)
    if create_trbble_result['message']=="Succesfully created trbble!!":
        trbble_id=str(create_trbble_result['trbbleId'])
        cursor.execute("update soundcloud.master_trbbles set trbble_url=1 where sc_t_id=%s " , (mt_track_id))
        conn.commit()
        seeded=1
    else:
        print("error creating trbble")
        print(create_trbble_result['message'])
        cursor.execute("update soundcloud.master_trbbles set trbble_url=2 where sc_t_id=%s " , (mt_track_id))
        conn.commit()
        seeded=0
    #return seeded

def get_genre(artist_name_genre):
        ec_genre=[]
        api_spotify='https://api.spotify.com/v1/search?&type=artist&authorisation=d77fe7100c19465b81934166937c45cd&q='
        api_ec='http://developer.echonest.com/api/v4/artist/profile?api_key=TIONEDH5VPGQRAV6V&bucket=genre&format=json&name='
        get_genre_spotify=api_spotify+urllib.quote_plus(artist_name_genre.encode('utf-8'))
        print(get_genre_spotify)
        open_spotify_genre=urlopen(get_genre_spotify).read()
        spotify_genre_json=json.loads(open_spotify_genre)
        print(spotify_genre_json)
        if 'artists' in spotify_genre_json:
          if spotify_genre_json['artists']['total']>0:        
            if len(spotify_genre_json['artists']['items'][0]['genres'])>0:
                genres=spotify_genre_json['artists']['items'][0]['genres']
                genre_joined=','.join(genres)
            else:
                get_genre_ec=api_ec+urllib.quote_plus(artist_name_genre.encode('utf-8'))
                open_ec=urlopen(get_genre_ec).read()
                json_genre=json.loads(open_ec)
                print(json_genre)
                if json_genre['response']['status']['code']==0:
                    if len(json_genre['response']['artist']['genres'])>0:
                        for genre in json_genre['response']['artist']['genres']:
                            ec_genre.append(genre['name']) 
                        genre_joined=','.join(ec_genre)
                    else:
                        genre_joined='Other'     
                else:
                    genre_joined='Other'
          else:
            get_genre_ec=api_ec+urllib.quote_plus(artist_name_genre.encode('utf-8'))
            open_ec=urlopen(get_genre_ec).read()
            json_genre=json.loads(open_ec)
            print(json_genre)
            if json_genre['response']['status']['code']==0:
                if len(json_genre['response']['artist']['genres'])>0:
                    for genre in json_genre['response']['artist']['genres']:
                        ec_genre.append(genre['name']) 
                        genre_joined=','.join(ec_genre)
                else:
                    genre_joined='Other'     
            else:
                genre_joined='Other'            
        else:
            get_genre_ec=api_ec+urllib.quote_plus(artist_name_genre.encode('utf-8'))
            open_ec=urlopen(get_genre_ec).read()
            json_genre=json.loads(open_ec)
            print(json_genre)
            if json_genre['response']['status']['code']==0:
                for genre in json_genre['response']['artist']['genres']:
                    ec_genre.append(genre['name']) 
                    genre_joined=','.join(ec_genre)
            else:
                genre_joined='Other' 
        return genre_joined
        
def get_child_genre(genres):
    final_genres=[]
    individual_genres=genres.split(',')
    for row in individual_genres:
        child_genre_query=cursor.execute("select parent_genre from soundcloud.genre_seeding_map where ec_genre=%s and parent_genre is not null limit 1",(row))
        if child_genre_query>0:
            child_genre_result=cursor.fetchone()
            child_genre=child_genre_result[0]
            print(child_genre)
            final_genres.append(child_genre)
        else:
            pass
    if len(final_genres)==0:
        final_child_genre='Others'
    else:
        final_genres=list(set(final_genres))
        final_child_genre=','.join(final_genres)
    print("Final child genres=",final_child_genre)     
    return final_child_genre        

def get_album_art(artist_name_image,sc_t_id):    
    print("getting album art")
    api_spotify='https://api.spotify.com/v1/search?&type=artist&authorisation=d77fe7100c19465b81934166937c45cd&q='
    api_ec='http://developer.echonest.com/api/v4/artist/profile?api_key=TIONEDH5VPGQRAV6V&bucket=genre&format=json'
    get_image_spotify=api_spotify+urllib.quote_plus(artist_name_image.encode('utf-8'))
    open_spotify_image=urlopen(get_image_spotify).read()
    spotify_image_json=json.loads(open_spotify_image)
    print(spotify_image_json)
    if 'artists' in spotify_image_json:
        if spotify_image_json['artists']['total']>0:
            if len(spotify_image_json['artists']['items'][0]['images'])>0:
                aa_med= spotify_image_json['artists']['items'][0]['images'][0]['url']
            else:
                soundcloud_api = 'http://api.soundcloud.com/tracks/'
                soundcloud_api_end='?client_id=e9254de57c63214abef885f505100d91'
                final_sc_api=soundcloud_api+str(sc_t_id)+soundcloud_api_end
                sc_api_open=urlopen(final_sc_api).read()
                sc_api_json=json.loads(sc_api_open)
                try:
                    aa_med=sc_api_json['artwork_url']
                except:
                    aa_med='https://s3-ap-southeast-1.amazonaws.com/trbble/Default-Album-Art.jpg' 
        else:
            soundcloud_api = 'http://api.soundcloud.com/tracks/'
            soundcloud_api_end='?client_id=e9254de57c63214abef885f505100d91'
            final_sc_api=soundcloud_api+str(sc_t_id)+soundcloud_api_end
            sc_api_open=urlopen(final_sc_api).read()
            sc_api_json=json.loads(sc_api_open)
            try:
                aa_med=sc_api_json['artwork_url']
            except:
                aa_med='https://s3-ap-southeast-1.amazonaws.com/trbble/Default-Album-Art.jpg'
    else:
        soundcloud_api = 'http://api.soundcloud.com/tracks/'
        soundcloud_api_end='?client_id=e9254de57c63214abef885f505100d91'
        final_sc_api=soundcloud_api+str(sc_t_id)+soundcloud_api_end
        sc_api_open=urlopen(final_sc_api).read()
        sc_api_json=json.loads(sc_api_open)
        try:
            aa_med=sc_api_json['artwork_url']
        except:
            aa_med='https://s3-ap-southeast-1.amazonaws.com/trbble/Default-Album-Art.jpg'
    return aa_med  
    
def create_comments_trbble(track_id,track_title_sc,artist_name_final,song_name_final,artist_id_final,song_id_final,id_source,sc_track_url,sc_duration,track_duration,genre_joined,aa_med,similarity,comment_count):
    payload={"scClientID": "7e840a97abea19c520373ed754348dcf",
            "trackID": track_id,
            "params": {
                        "snippetLength": 30000,
                        "skipStart": 60000,
                        "skipEnd": 30000,
                        "scanResolution": 500,
                        "commentBucketSize": 5000,
                        "minCommentsInBucket": 0,
                        "minPositiveCommentsInBucket": 0,
                        "minDistanceBetweenSnippets": 20000
                       }
             } 
    print(payload)      
    comments_json=requests.post(comments_url,data=json.dumps(payload),verify='False')
    print(comments_json.json())
    resp=json.dumps(comments_json.json())
    output=json.loads(resp)
    t1_start=output['snippets'][0]['StartTime']
    id_source="echonest"
    cursor.execute("insert into soundcloud.master_trbbles set sc_t_id=%s ,sc_track_title=%s, artist_name=%s ,song_name=%s ,artist_id=%s ,song_id =%s,id_source=%s ,sc_url=%s ,duration_s=%s,duration_m=%s ,genres=%s ,trbble_type='comments',aa_med=%s ,match_percent_final=%s,t1_start_time=%s,comment_count=%s" , (track_id,track_title_sc,artist_name_final,song_name_final,artist_id_final,song_id_final,id_source,sc_track_url,sc_duration,track_duration,genre_joined,aa_med,similarity,t1_start,comment_count))
    conn.commit()
    return t1_start
    
def create_comments_trbble_sc(track_id,track_title,sc_track_url,sc_duration,track_duration,aa_med,comment_count):
    payload={"scClientID": "7e840a97abea19c520373ed754348dcf",
            "trackID": track_id,
            "params": {
                        "snippetLength": 30000,
                        "skipStart": 60000,
                        "skipEnd": 30000,
                        "scanResolution": 500,
                        "commentBucketSize": 5000,
                        "minCommentsInBucket": 0,
                        "minPositiveCommentsInBucket": 0,
                        "minDistanceBetweenSnippets": 20000
                       }
             } 
    print(payload)      
    comments_json=requests.post(comments_url,data=json.dumps(payload),verify = 'False')
    print(comments_json.json())
    resp=json.dumps(comments_json.json())
    output=json.loads(resp)
    t1_start=output['snippets'][0]['StartTime']
    id_source="echonest"
    cursor.execute("insert into soundcloud.master_trbbles set sc_t_id=%s ,sc_track_title=%s,sc_url=%s ,duration_s=%s,duration_m=%s ,trbble_type='comments',aa_med=%s ,t1_start_time=%s,comment_count=%s" , (track_id,track_title_sc,sc_track_url,sc_duration,track_duration,aa_med,t1_start,comment_count))
    conn.commit()
    return t1_start
    
def find_trbble_on_platform(sc_track_id):
    payload={"trackId":sc_track_id,"page":0,"pageSize":10}
    check_trbble=requests.post(trbble_find_api,data=json.dumps(payload),verify = 'False')
    check_trbble=check_trbble.json
    if 'trbble' in check_trbble:
        trbble_id=check_trbble['trbbles'][0]['trbbleId']
        found_trbble=1
    else:
        found_trbble=0
        trbble_id=None
    return found_trbble,trbble_id 
    
def metadata_vinay(song):
  song_name=None
  u=None
  coo=None
  similarity=None
  spotify_combined='https://api.spotify.com/v1/search?&type=track&authorisation=d77fe7100c19465b81934166937c45cd&q='

  artistname=[]
  songname=[]
  listremove=[]
  f=[]
  song = song.lower()

  song1=Normalize(song)
  
  song1=song1.lower()
  
  split_song=split(song1)
  
  dic_1=['feat','ft.','feat.','ft']
  
  result=checksum(dic_1,split_song)
  print result
  
  if result in split_song:
      print "1"
      split_song.remove(result)
      song1= ' '.join(split_song)
      combined_search=spotify_combined+song1.encode('utf-8','ignore')
      combined_api_open=urlopen(combined_search).read()
      spotify_results=json.loads(combined_api_open)
      if len(spotify_results['tracks']['items'])>0:
          for j in  spotify_results['tracks']['items']:
                  a=0
                  count=len(j['artists'])
                  title=j['name']
                  print title
                  while a<count:
                      a=a+1
                      artist_name_i=j['artists'][a-1]['name']
                      artistname.append(artist_name_i)
                      artistname=list(set(artistname))
                  removespaceartist1=' '.join(artistname)
                  removespaceartist2=insert_space(removespaceartist1)
                  spaceartist=removespaceartist2.split()
                  print spaceartist
                  spaceartist111=' '.join(spaceartist)
                  spaceartist111=spaceartist111.title()
                  spaceartist111 = spaceartist111.split()
                  if 'original' in song:
                      song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                  else:
                      song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                  removespacesong2 = insert_space(song_name)
                  spacesong= removespacesong2.split()
                  print spacesong
                  t = check(spacesong,spaceartist)
                  res_2 = list(set(spaceartist)^set(t))
                  if len(res_2)>0:
                      compare_term_2 = ' & '.join(res_2)
                      compare_term = ' '.join(res_2)
                  else:
                      compare_term_2 = ' & '.join(spaceartist)
                  song_name = ' '.join(spacesong)
                  compare_term = ' '.join(res_2)
                  compare_term_1 = compare_term+' '+song_name
                  similarity= fuzz.token_sort_ratio(compare_term_1.lower(),song1.lower())
                  x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                  t = check(x,artistname)   
                  coo = ' & '.join(t)
                  u=list(set(artistname)^set(t))
                  u=list(set(u))
                  u = ' '.join(u)
                  print similarity
                  if similarity>=80:
                      print "Artist :", u.title() + ' & ' + coo
                      print "Song :",song_name.title()
                      break
                  else:
                      print "similarity was less than 90%"
  
      else:
          try:
              print "2"
              if ('remix' in song or 'mix' in song or 'rmx' in song):
                  print "Mix/Remix present in ", song1
                  song2= re.sub('\([^)]*\)', '', song1)
                  combined_search=spotify_combined+song2.encode('utf-8','ignore')
                  combined_api_open=urlopen(combined_search).read()
                  spotify_results=json.loads(combined_api_open)
                  if len(spotify_results['tracks']['items'])>0:
                      for j in  spotify_results['tracks']['items']:
                          a=0
                          count=len(j['artists'])
                          title=j['name']
                          while a<count:
                              a=a+1
                              artist_name_i=j['artists'][a-1]['name']
                              artistname.append(artist_name_i)
                              artistname=list(set(artistname))
                          print artistname
                          removespaceartist1=' '.join(artistname)
                          removespaceartist2=insert_space(removespaceartist1)
                          spaceartist=removespaceartist2.split()
                          print spaceartist
                          spaceartist111=' '.join(spaceartist)
                          spaceartist111=spaceartist111.title()
                          spaceartist111 = spaceartist111.split()
                          if 'original' in song:
                              song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                          else:
                              song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                          removespacesong2 = insert_space(song_name)
                          spacesong= removespacesong2.split()
                          print spacesong
                          t = check(spacesong,spaceartist)
                          res_2 = list(set(spaceartist)^set(t))
                          print res_2
                          if len(res_2)>0:
                              compare_term_2 = ' & '.join(res_2)
                              compare_term = ' '.join(res_2)
                          else:
                              compare_term_2 = ' & '.join(spaceartist)
                          song_name = ' '.join(spacesong)
                          compare_term = ' '.join(res_2)
                          compare_term_1 = compare_term+' '+song_name
                          similarity= fuzz.token_sort_ratio(compare_term_1.lower(),song1.lower()) 
                          print similarity
                          x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                          t = check(x,artistname)   
                          coo = ' & '.join(t)
                          u=list(set(artistname)^set(t))
                          u=list(set(u))
                          u = ' '.join(u)
                          if similarity>=80:
                              print "Artist :", u.title() + ' & ' + coo
                              print "Song :",song_name.title()
                              break
              else:
                      print "2.1"
                      song3= re.sub('\([^)]*\)', '', song1) 
                      combined_search=spotify_combined+song3.encode('utf-8','ignore')
                      combined_api_open=urlopen(combined_search).read()   
                      spotify_results=json.loads(combined_api_open)
                      for j in  spotify_results['tracks']['items']:
                          a=0
                          count=len(j['artists'])
                          title=j['name']
                          while a<count:
                              a=a+1
                              artist_name_i=j['artists'][a-1]['name']
                              artistname.append(artist_name_i)
                              artistname=list(set(artistname))
                          print artistname
                          removespaceartist1=' '.join(artistname)
                          removespaceartist2=insert_space(removespaceartist1)
                          spaceartist=removespaceartist2.split()
                          print spaceartist
                          spaceartist111=' '.join(spaceartist)
                          spaceartist111=spaceartist111.title()
                          spaceartist111 = spaceartist111.split()
                          if 'original' in song:
                              song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                          else:
                              song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                          removespacesong2 = insert_space(song_name)
                          spacesong= removespacesong2.split()
                          print spacesong
                          t = check(spacesong,spaceartist)
                          res_2 = list(set(spaceartist)^set(t))
                          print res_2
                          if len(res_2)>0:
                              compare_term_2 = ' & '.join(res_2)
                              compare_term = ' '.join(res_2)
                          else:
                              compare_term_2 = ' & '.join(spaceartist)
                          song_name = ' '.join(spacesong)
                          compare_term = ' '.join(res_2)
                          compare_term_1 = compare_term+' '+song_name
                          similarity=fuzz.token_sort_ratio(compare_term_1.lower(),song3.lower())
                          x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                          t = check(x,artistname)   
                          coo = ' & '.join(t)
                          u=list(set(artistname)^set(t))
                          u=list(set(u))
                          u = ' '.join(u)
                          if similarity>=80:
                              print "Artist :", u.title() + ' & ' + coo
                              print "Song :",song_name.title()
                              break
  
          except:
              print "3"
              song3= re.sub('\([^)]*\)', '', song1) 
              combined_search=spotify_combined+song3.encode('utf-8','ignore')
              combined_api_open=urlopen(combined_search).read()   
              spotify_results=json.loads(combined_api_open)
              for j in  spotify_results['tracks']['items']:
                  a=0
                  count=len(j['artists'])
                  title=j['name']
                  while a<count:
                      a=a+1
                      artist_name_i=j['artists'][a-1]['name']
                      artistname.append(artist_name_i)
                      artistname=list(set(artistname))
                  print artistname
                  removespaceartist1=' '.join(artistname)
                  removespaceartist2=insert_space(removespaceartist1)
                  spaceartist=removespaceartist2.split()
                  print spaceartist
                  spaceartist111=' '.join(spaceartist)
                  spaceartist111=spaceartist111.title()
                  spaceartist111 = spaceartist111.split()
                  if 'original' in song:
                      song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                  else:
                      song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                  removespacesong2 = insert_space(song_name)
                  spacesong= removespacesong2.split()
                  print spacesong
                  t = check(spacesong,spaceartist)
                  res_2 = list(set(spaceartist)^set(t))
                  print res_2
                  if len(res_2)>0:
                      compare_term_2 = ' & '.join(res_2)
                      compare_term = ' '.join(res_2)
                  else:
                      compare_term_2 = ' & '.join(spaceartist)
                  song_name = ' '.join(spacesong)
                  compare_term = ' '.join(res_2)
                  compare_term_1 = compare_term+' '+song_name
                  similarity=fuzz.token_sort_ratio(compare_term_1.lower(),song3.lower())
                  x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                  t = check(x,artistname)   
                  coo = ' & '.join(t)
                  u=list(set(artistname)^set(t))
                  u=list(set(u))
                  u = ' '.join(u)
                  if similarity>=80:
                      print "Artist :", u.title() + ' & ' + coo
                      print "Song :",song_name.title()
                      break
  
  
  else:
      print "4"
      if ('remix' in song or 'mix' in song or 'rmx' in song):
          print "Mix/Remix present in ", song1
          song2= re.sub('\([^)]*\)', '', song1)
          combined_search=spotify_combined+song2.encode('utf-8','ignore')
          combined_api_open=urlopen(combined_search).read()
          spotify_results=json.loads(combined_api_open)
          if len(spotify_results['tracks']['items'])>0:
              for j in  spotify_results['tracks']['items']:
                  a=0
                  count=len(j['artists'])
                  title=j['name']
                  while a<count:
                      a=a+1
                      artist_name_i=j['artists'][a-1]['name']
                      artistname.append(artist_name_i)
                      artistname=list(set(artistname))
                  removespaceartist1=' '.join(artistname)
                  removespaceartist2=insert_space(removespaceartist1)
                  spaceartist=removespaceartist2.split()
                  print spaceartist
                  spaceartist111=' '.join(spaceartist)
                  spaceartist111=spaceartist111.title()
                  spaceartist111 = spaceartist111.split()
                  if 'original' in song:
                      song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                  else:
                      song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                  removespacesong2 = insert_space(song_name)
                  spacesong= removespacesong2.split()
                  print spacesong
                  t = check(spacesong,spaceartist)
                  res_2 = list(set(spaceartist)^set(t))
                  if len(res_2)>0:
                      compare_term_2 = ' & '.join(res_2)
                      compare_term = ' '.join(res_2)
                  else:
                      compare_term_2 = ' & '.join(spaceartist)
                  song_name = ' '.join(spacesong)
                  compare_term = ' '.join(res_2)
                  compare_term_1 = compare_term+' '+song_name
                  similarity= fuzz.token_sort_ratio(compare_term_1.lower(),song.lower())
                  x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                  t = check(x,artistname) 
                  t=list(set(t))  
                  coo = ' & '.join(t)
                  u=list(set(artistname)^set(t))
                  u=list(set(u))
                  u = ' '.join(u)
                  if similarity>=80:
                      print "Artist :", u.title() + ' & ' + coo
                      print "Song :",song_name.title()
                      break
                  else:
                      print "similarity was less than 90%"
  
      else:
          print "5"
          combined_search=spotify_combined+song1.encode('utf-8','ignore')
          combined_api_open=urlopen(combined_search).read()
          spotify_results=json.loads(combined_api_open)
          if len(spotify_results['tracks']['items'])>0:
              for j in  spotify_results['tracks']['items']:
                  a=0 
                  count=len(j['artists'])
                  title=j['name']
                  while a<count:
                      a=a+1
                      artist_name_i=j['artists'][a-1]['name']
                      artistname.append(artist_name_i)
                      artistname=list(set(artistname))
                  print artistname
                  removespaceartist1=' '.join(artistname)
                  removespaceartist2=insert_space(removespaceartist1)
                  spaceartist=removespaceartist2.split()
                  print spaceartist
                  spaceartist111=' '.join(spaceartist)
                  spaceartist111=spaceartist111.title()
                  spaceartist111 = spaceartist111.split()
                  if 'original' in song:
                      song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                  else:
                      song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                  removespacesong2 = insert_space(song_name)
                  spacesong= removespacesong2.split()
                  print spacesong
                  t = check(spacesong,spaceartist)
                  res_2 = list(set(spaceartist)^set(t))
                  if len(res_2)>0:
                      compare_term_2 = ' & '.join(res_2)
                      compare_term = ' '.join(res_2)
                  else:
                      compare_term_2 = ' & '.join(spaceartist)
                  song_name = ' '.join(spacesong)
                  compare_term = ' '.join(res_2)
                  compare_term_1 = compare_term+' '+song_name
                  similarity= fuzz.token_sort_ratio(compare_term_1.lower(),song1.lower())
                  x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                  t = check(x,artistname)   
                  coo = ' & '.join(t)
                  u=list(set(artistname)^set(t))
                  u=list(set(u))
                  u = ' '.join(u)
                  print similarity
                  if similarity>=80:
                      print "Artist :",u.title() + ' & ' + coo
                      print "Song :",song_name.title()
                      break
  
          else:
              print "6"
              song3= re.sub('\([^)]*\)', '', song1) 
              combined_search=spotify_combined+song3.encode('utf-8','ignore')
              combined_api_open=urlopen(combined_search).read()   
              spotify_results=json.loads(combined_api_open)
              if len(spotify_results['tracks']['items'])>0:
                  for j in  spotify_results['tracks']['items']:
                      a=0
                      count=len(j['artists'])
                      title=j['name']
                      while a<count:
                          a=a+1
                          artist_name_i=j['artists'][a-1]['name']
                          artistname.append(artist_name_i)
                          artistname=list(set(artistname))
                      print artistname
                      removespaceartist1=' '.join(artistname)
                      removespaceartist2=insert_space(removespaceartist1)
                      spaceartist=removespaceartist2.split()
                      print spaceartist
                      spaceartist111=' '.join(spaceartist)
                      spaceartist111=spaceartist111.title()
                      spaceartist111 = spaceartist111.split()
                      if 'original' in song:
                          song_name=re.sub('Radio Edit|Mix Cut|\[|\]',' ',title)
                      else:
                          song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                      removespacesong2 = insert_space(song_name)
                      spacesong= removespacesong2.split()
                      print spacesong
                      t = check(spacesong,spaceartist)
                      res_2 = list(set(spaceartist)^set(t))
                      print res_2
                      if len(res_2)>0:
                          compare_term_2 = ' & '.join(res_2)
                          compare_term = ' '.join(res_2)
                      else:
                          compare_term_2 = ' & '.join(spaceartist)
                      song_name = ' '.join(spacesong)
                      compare_term = ' '.join(res_2)
                      compare_term_1 = compare_term+' '+song_name
                      similarity=fuzz.token_sort_ratio(compare_term_1.lower(),song3.lower())
                      x=[" ".join(map(str,comb)) for comb in combinations(spaceartist111, 2)]
                      t = check(x,artistname)   
                      coo = ' & '.join(t)
                      u=list(set(artistname)^set(t))
                      u=list(set(u))
                      u = ' '.join(u)
                      if similarity>=80:
                          print "Artist :", u.title() + ' & ' + coo
                          print "Song :",song_name.title()
                          break
   
  
              else:
                  print "7"
                  combined_search=spotify_combined+song1.encode('utf-8','ignore')
                  combined_api_open=urlopen(combined_search).read()
                  spotify_results=json.loads(combined_api_open)
                  print spotify_results
                  if len(spotify_results['tracks']['items'])>0:
                      a=0 
                      count=len(j['artists'])
                      title=j['name']
                      while a<count:
                          a=a+1
                          artist_name_i=j['artists'][a-1]['name']
                          artistname.append(artist_name_i)
                          artistname=list(set(artistname))
                      song_name=re.sub('Original Mix|Radio Edit|Mix Cut|\[|\]',' ',title)
                      songname=song_name.split()
                      f=check(songname,artistname)
                      res = list(set(artistname)^set(f))
                      print res
                      compare_term_2 = ' & '.join(res)
                      compare_term =  ' '.join(res)
                      compare_term_1 = compare_term+' '+song_name
                      similarity= fuzz.token_sort_ratio(compare_term.lower(),song1.lower())
                      if similarity>=80:
                          print "Artist :",compare_term_2
                          print "Song :",song_name
                      else:
                          print "Update bc"
                            
  if song_name is not None and similarity is not None:
      if similarity>=80:
          artist_name_final=u.title() + '  '
          if len(coo)>0:
              artist_name_2=coo
          else:
              artist_name_2=" "    
          song_name_final=song_name.title() 
          track_title_final=artist_name_final+artist_name_2+' '+song_name_final
          
      else:
          artist_name_final=None
          artist_name_2=None
          song_name_final=None
          track_title_final=None   
      return artist_name_final,song_name_final,track_title_final                                                                                        
  else:
      artist_name_final=None
      artist_name_2=None
      song_name_final=None
      track_title_final=None
      return artist_name_final,song_name_final,track_title_final 
      
def get_tweet(tweet_type,rnd_twt_int):
    if tweet_type=="Mix":
        if rnd_twt_int==1:
            tweet="We like your music taste! So made a small mix from the best parts of similar songs you might like"
        elif rnd_twt_int==2:
            tweet="What if you could listen to a playlist of best parts of songs and decide on the ones you like?"
        else:
            tweet="Playlists are good! But a playlist made from the best parts of songs is better! :)"        

    elif tweet_type=="trbble"
        if rnd_twt_int==1:
            tweet="We love that song! Here's one just like it and just as awesome - listen to best part (~30s)"
        elif rnd_twt_int==2:
            tweet="That song is beautiful! And the listeners who like it, love this one"
        else:
            tweet="What's better than one song discovery? Two! And all in ~30s!"        

    else:
        if rnd_twt_int==1:
            tweet="	Was this the part you liked most? Discover quick, discover more :)"
        elif rnd_twt_int==2:
            tweet="Would you agree if someone said this is the best part of the song? Like if you do, make another if you don't!"
        else:
            tweet="Hit the link to listen to the compressed awesomeness of this song (or the song's best part)"        
        
    return tweet                                                                                    
    
         
    
class MyListener(StreamListener):
    
    global conn
    conn=pymysql.connect(db='twitter_users', user='root' , host= 'localhost' , port=3307, charset="utf8", use_unicode=True)
    global cursor
    cursor=conn.cursor()
    
    def on_status(self, status):
        global exp
        global f
        global en
        global artist_final
        global api_beg
        global api_end
        global api_final
        global genre 
        global Channel
        global check
        global query_result
        completed=0
        ec_genre=[]
        Handle=status.user.screen_name
        country=status.user.location
        tweet=status.text
        followers=status.user.followers_count
        Device=status.source
        print('Device')
        tweet_time=status.created_at
        print(tweet_time)
        if len(status.entities['urls'])>0 and followers>=100 and followers<=500:
            expanded_url=status.entities['urls'][0]['expanded_url']
            Channel , track_title= get_channel(expanded_url)
            if track_title is not None and Channel!='8tracks':
                    artist_name_final,song_name_final,track_title_final=metadata_vinay(track_title)
                    if track_title_final is not None:
                        print("track search of soundcloud")
                        print("hitting soundcloud")
                        sc_tracks_api = sc_api_beg+ sc_api_end+quote_plus(track_title_final.encode('utf-8'))
                        print(sc_tracks_api)
                        sc_tracks_open=urlopen(sc_tracks_api).read()
                        # print(sc_tracks_open)
                        tracks=json.loads(sc_tracks_open)    
                        print("entering for loop for SC")
                        try:
                            for i in tracks:
                                track_title_sc=i['title']
                                track_id=i['id']
                                sc_duration=i['duration']/1000
                                sc_track_url=i['permalink_url']
                                sc_username=i['user']['username']
                                sc_similarity=fuzz.token_sort_ratio(track_title_sc,track_title_final)
                                sc_similarity_2=fuzz.token_sort_ratio(sc_username+'-'+track_title_sc,track_title_final)
                                streamable=i['streamable']
                                comment_count=i['comment_count']
                                if (sc_similarity>=85 or sc_similarity_2>=85) and streamable is True and 'cover' not in track_title :
                                    check_existing_trbbles,trbble_id=find_trbble_on_platform(track_id)
                                    if check_existing_trbbles==1:
                                        print("trbble already on platform-posting to user") 
                                        reply="Same trbble"
                                        posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,trbble_id,reply,tweet_time)
                                        completed=1
                                        break   
                                    else:
                                        query=cursor.execute("select a.artist_name,a.song_name,a.sc_t_id,a.aa_med,a.genres,a.duration_s,a.t1_start_time,a.sc_url,trbble_url from final_backup.master_trbbles as a where a.sc_t_id=%s limit 1" , (track_id))
                                        if query>0:
                                            trbble_results=cursor.fetchone()
                                            mt_artist=trbble_results[0]
                                            mt_song_name=trbble_results[1]
                                            mt_track_id=str(trbble_results[2])
                                            mt_album_art=trbble_results[3]
                                            mt_genres=trbble_results[4]
                                            mt_genres=get_child_genre(mt_genres)
                                            mt_sc_duration=trbble_results[5]
                                            mt_trbble_url='https://api.soundcloud.com/tracks/'+track_id
                                            mt_start_time=trbble_results[6]/1000
                                            mt_sc_url=trbble_results[7]
                                            mt_seeded=trbble_results[8]
                                            mt_end_batch=randint(1,4)
                                            mt_trbble_duration=random_endtime(end_batch)
                                            mt_end_time=start_time+trbble_duration
                                            mt_trbble_id=trbble_results[9]
                                            print("trbble present in DB but not seeded -seeding and posting")
                                            seed_trbble(mt_song_name,mt_start_time,mt_end_time,mt_trbble_duration,mt_track_id,mt_trbble_url,mt_sc_url,mt_album_art,mt_artist,mt_genres,mt_sc_duration)
                                            reply="Same trbble"
                                            posting_to_db(Channel,Handle,country,tweet,Device,mt_artist,mt_song_name,mt_track_id,reply,tweet_time)
                                            completed=1
                                            break
                                        else:
                                            pass    
                                else:
                                    completed=0
                                    print("Checking Next SC Item")
                                    pass
                        except:
                                if completed==0:
                                    print("no sc title found, getting genre and posting trbble/mix")
                                    reply_type_check=randint(1,4)
                                    if artist_name_final is not None:
                                        final_parent_genres_list=get_genre(artist_name_final)
                                        final_parent_genres_list=get_child_genre(final_parent_genres_list)
                                        final_parent_genres_list=final_parent_genres_list.split()
                                        if reply_type_check==1 or reply_type_check==3:
                                            reply="trbble"
                                            if 'Rock' in final_parent_genres_list:
                                                mt_trbble_id='ca43af7a-3651-47d0-bae2-a513d0669e71'
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Metal' in final_parent_genres_list or 'Heavy Metal' in final_parent_genres_list:
                                                mt_trbble_id='2ad034b9-3f38-4bb6-bc7f-16ecb25abfe8'
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Pop' in final_parent_genres_list or 'Ambient' in final_parent_genres_list:
                                                mt_trbble_id='f5b36d07-953a-4067-88d0-61050f12c4f2'
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Electronic' in  final_parent_genres_list or 'Edm' in final_parent_genres_list or 'Trance' in final_parent_genres_list or 'House' in final_parent_genres_list:
                                                mt_trbble_id='1e365f20-6c65-4cdd-b25d-434eca503747'
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Dubstep' in final_parent_genres_list:
                                                mt_trbble_id='433f8b4e-36b9-432b-a58b-9a1e40f7cd4b'              
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Country' in final_parent_genres_list:
                                                mt_trbble_id='b7f0226c-4b23-4f19-bac8-517a3ea1d926'              
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'Hip Hop' in final_parent_genres_list:
                                                mt_trbble_id='7fdb1cca-34e6-4080-a04a-46a7991bc303'              
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            elif 'R&B & Soul' in final_parent_genres_list:
                                                mt_trbble_id='5e81ff6c-81c4-4573-97bb-7f06d92f137a'              
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                                            else:
                                                mt_trbble_id='4b5d37c3-34d8-47b5-86ae-e8b413aa70df'              
                                                posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)                
                                        else:
                                                reply="Mix"
                                                print("fetched genre-checking for mix")
                                                if 'Rock' in final_parent_genres_list:
                                                    print("fetched genre=Rock")
                                                    mix_url='https://trbble.com/playlist?id=b7436168-a2cb-47cb-8b10-0bc14396d945'+'&utm_medium=twitter&utm_source='+Channel+'&utm_campaign='+Handle
                                                elif 'Hip hop' in final_parent_genres_list:
                                                    print("fetched genre=Hip Hop")
                                                    mix_url='https://trbble.com/playlist?id=621e26ee-e099-4384-9974-20e423d57c5f'+'&utm_medium=twitter&utm_source='+Channel+'&utm_campaign='+Handle
                                                elif 'Pop' in final_parent_genres_list or 'Ambient' in final_parent_genres_list:
                                                    mix_url='https://trbble.com/playlist?id=4c95d8d9-540c-4026-92ef-461abf302ffc'+'&utm_medium=twitter&utm_source='+Channel+'&utm_campaign='+Handle
                                                elif 'Metal' in final_parent_genres_list or 'Heavy Metal' in final_parent_genres_list:
                                                    mix_url='https://trbble.com/playlist?id=b7436168-a2cb-47cb-8b10-0bc14396d945'+'&utm_medium=twitter&utm_source='+Channel+'&utm_campaign='+Handle        
                                                else:
                                                    print("fetched genre=electronic/others")
                                                    mix_url='http://trbble.com/playlist?id=f5bb81f8-a02f-409f-a5fb-68729fcadddb'+ '&utm_medium=twitter&utm_source='+Channel +'&utm_campaign='+Handle       
                                                bitly_api_beg='https://api-ssl.bitly.com/v3/shorten?access_token=d1040ddda961aff8e0f82dd38e66f2594cf06e48&longUrl='
                                                bitly_complete_api=bitly_api_beg+quote_plus(mix_url)
                                                open_bitly=urlopen(bitly_complete_api).read()
                                                print("Fetched bitly")
                                                print(open_bitly)
                                                bitly_json=json.loads(open_bitly)
                                                bitly_url=bitly_json['data']['url']
                                                bitly_hash=bitly_json['data']['hash']
                                                global_hash=bitly_json['data']['global_hash']  
                                                cursor.execute("insert into twitter_users set handle=%s,country=%s,tweet=%s,Device=%s,reply_type=%s,bitly_url=%s,bitly_hash=%s,bitly_g_hash=%s,channel=%s,tweet_time=%s", (Handle,country,tweet,Device,reply,bitly_url,bitly_hash,global_hash,Channel,tweet_time))
                                                conn.commit()
                                                completed=1
                                            
                                    else:
                                        pass            
                                else:
                                    pass        
                        else:
                             print("No results found for track title")
                             pass                                                                                       
            elif track_title is not None and Channel=='8tracks' and (Device=='TweetDeck' or Device=='Twitter Web Client'):
                final_parent_genres_list=get_genre(track_title)
                final_parent_genres_list=get_child_genre(final_parent_genres_list)
                final_parent_genres_list=final_parent_genres_list.split()    
                reply="trbble 8 tracks"
                if 'Rock' in final_parent_genres_list:
                    mt_trbble_id='ca43af7a-3651-47d0-bae2-a513d0669e71'
                    artist_name_final="Agam"
                    song_name_final="the boat song"
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Metal' in final_parent_genres_list or 'Heavy Metal' in final_parent_genres_list:
                    mt_trbble_id='2ad034b9-3f38-4bb6-bc7f-16ecb25abfe8'
                    artist_name_final="Pantera"
                    song_name_final="I'm Broken"
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Pop' in final_parent_genres_list or 'Ambient' in final_parent_genres_list:
                    mt_trbble_id='f5b36d07-953a-4067-88d0-61050f12c4f2'
                    artist_name_final="xylo"
                    song_name_final="America"
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Electronic' in  final_parent_genres_list or 'Edm' in final_parent_genres_list or 'Trance' in final_parent_genres_list or 'House' in final_parent_genres_list:
                    mt_trbble_id='1e365f20-6c65-4cdd-b25d-434eca503747'
                    artist_name_final="Ilan bluestone"
                    song_name_final="Under my skin"
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Dubstep' in final_parent_genres_list:
                    mt_trbble_id='433f8b4e-36b9-432b-a58b-9a1e40f7cd4b'
                    artist_name_final="Minesotta"
                    song_name_final="Colours"              
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Country' in final_parent_genres_list:
                    mt_trbble_id='b7f0226c-4b23-4f19-bac8-517a3ea1d926'
                    artist_name_final="ohia"
                    song_name_final="Farewell transmission"              
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'Hip Hop' in final_parent_genres_list:
                    mt_trbble_id='7fdb1cca-34e6-4080-a04a-46a7991bc303'
                    artist_name_final="HugLife"
                    song_name_final="Wicked games"              
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                elif 'R&B & Soul' in final_parent_genres_list:
                    mt_trbble_id='5e81ff6c-81c4-4573-97bb-7f06d92f137a'
                    artist_name_final="the xx"
                    song_name_final="Shelter"              
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
                else:
                    mt_trbble_id='4b5d37c3-34d8-47b5-86ae-e8b413aa70df'
                    artist_name_final="Xylo"
                    song_name_final="Afterlife"              
                    posting_to_db(Channel,Handle,country,tweet,Device,artist_name_final,song_name_final,mt_trbble_id,reply,tweet_time)
            
            else:
                print("No results found for given t.co url")
                pass
        else:
            print("No Url found/Followers not in range")
            pass        
   
    def on_error(self, status):
        print(status)
        return True
        
    def on_timeout(self):
        print("Received timeout. Sleep for 20 secs")
        time.sleep(20)
        return True  

def start_stream():        
    while True:
        try:
            twitter_stream = Stream(auth, MyListener())
            twitter_stream.filter(track=['shz am' , 'soundhound com','di fm' , 'spoti fi' ,'p dora','awe sm','8tracks com','pitchfork com','mixcloud com','awa fm','youtu be'])
        except:

        
            continue    
     e   
